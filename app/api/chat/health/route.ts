/**
 * Route Handler (server only) — chatbot availability probe.
 *
 * Pings the local Ollama daemon with a short timeout so the chat UI can
 * degrade gracefully (e.g. on the deployed Vercel site, where no Ollama
 * exists): unreachable → the panel shows a friendly "runs in the local
 * demo" card instead of hanging or crashing. Also reports whether the
 * configured model has been pulled, so the UI can hint at `ollama pull`.
 */

import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { models?: { name?: string }[] };
    const modelAvailable = (body.models ?? []).some(
      (m) =>
        m.name === OLLAMA_MODEL || m.name?.startsWith(`${OLLAMA_MODEL}:`)
    );
    return NextResponse.json({
      ok: true,
      model: OLLAMA_MODEL,
      modelAvailable,
    });
  } catch {
    return NextResponse.json(
      { ok: false, model: OLLAMA_MODEL, modelAvailable: false },
      { status: 200 } // availability info, not an error — keeps clients simple
    );
  }
}
