/**
 * Route Handler (server only) — the AI assistant endpoint.
 *
 * Proxies chat to a LOCAL Ollama instance (http://localhost:11434 by
 * default; no API keys anywhere) and streams the reply back as plain text.
 *
 * ROLE AWARENESS — the load-bearing design: this handler reads the
 * analyst_session cookie ON THE SERVER and builds the system prompt
 * accordingly. For public visitors, restricted fields are excluded from the
 * context entirely and the prompt says restricted data requires analyst
 * sign-in — so the model literally cannot leak values it never received.
 * Access is enforced at the data boundary; the model is never trusted to
 * self-censor. (NOTE: the proxy matcher exempts /api/*, so this handler
 * does its own session check — as every /api route serving tiered data
 * must.)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ANALYST_COOKIE, ANALYST_COOKIE_VALUE } from "@lib/auth";
import { buildChatSystemPrompt } from "@lib/chatContext";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

/** Guardrails for a tiny local model + an in-memory demo. */
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function parseMessages(body: unknown): ChatMessage[] | null {
  if (body === null || typeof body !== "object") return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    return null;
  }
  const messages: ChatMessage[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object") return null;
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.length === 0) return null;
    messages.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
  }
  if (messages[messages.length - 1].role !== "user") return null;
  return messages;
}

export async function POST(request: Request) {
  const messages = parseMessages(await request.json().catch(() => null));
  if (!messages) {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  // The role decision happens HERE, server-side, from the httpOnly cookie —
  // nothing the browser sends in the chat body can elevate it.
  const cookieStore = await cookies();
  const role =
    cookieStore.get(ANALYST_COOKIE)?.value === ANALYST_COOKIE_VALUE
      ? ("analyst" as const)
      : ("public" as const);

  const systemPrompt = await buildChatSystemPrompt(role);

  let upstream: Response;
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
      // Generous connect budget — model load on first request can be slow —
      // but bounded, so the UI degrades instead of hanging forever.
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ error: "ollama_unreachable" }, { status: 503 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "ollama_error" }, { status: 502 });
  }

  // Ollama streams NDJSON ({"message":{"content":"…"},"done":false} per
  // line); re-emit just the content tokens as a plain text stream, which
  // keeps the client trivial (read + append).
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";
  const textStream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffered += decoder.decode(chunk, { stream: true });
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as {
              message?: { content?: string };
            };
            const token = parsed.message?.content;
            if (token) controller.enqueue(encoder.encode(token));
          } catch {
            // Skip malformed lines rather than killing the stream.
          }
        }
      },
    })
  );

  return new Response(textStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
