"use client";
// Client Component — the AI assistant drawer (floating button, slide-in
// panel, streamed replies). PRESENTATION ONLY with respect to access: the
// `role` prop just labels the tier in the UI. The /api/chat handler
// re-derives the role from the httpOnly session cookie server-side and
// builds the model's context accordingly — nothing this component sends can
// elevate access.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TIER_COLOR } from "@lib/layerColors";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Health = "unknown" | "checking" | "ok" | "no-model" | "down";

const STARTERS = [
  "Which fire district covers the most ground?",
  "How many flood hazard zones are mapped in the county?",
  "Which cities have polling locations?",
];

export default function ChatPanel({ role }: { role: "public" | "analyst" }) {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<Health>("unknown");
  const [model, setModel] = useState("llama3.2:3b");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const checkHealth = useCallback(async () => {
    setHealth("checking");
    try {
      const res = await fetch("/api/chat/health");
      const body = (await res.json()) as {
        ok: boolean;
        model: string;
        modelAvailable: boolean;
      };
      setModel(body.model);
      setHealth(body.ok ? (body.modelAvailable ? "ok" : "no-model") : "down");
    } catch {
      setHealth("down");
    }
  }, []);

  // Probe once, on first open.
  useEffect(() => {
    if (open && health === "unknown") void checkHealth();
  }, [open, health, checkHealth]);

  // Keep the newest tokens in view while streaming.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Cancel any in-flight generation when the panel unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;
    setFailed(false);
    setInput("");
    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setHealth(res.status === 503 ? "down" : health);
        throw new Error(`HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        if (!token) continue;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = {
            ...last,
            content: last.content + token,
          };
          return next;
        });
      }
    } catch {
      if (!controller.signal.aborted) {
        setFailed(true);
        // Drop the empty assistant stub so the user can retry cleanly.
        setMessages((prev) =>
          prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[900] flex items-center gap-2 border border-line bg-surface-2 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground shadow-[0_4px_24px_rgba(4,8,14,0.6)] transition-colors duration-150 hover:border-foreground active:scale-[0.98]"
      >
        <span aria-hidden="true" className="text-base leading-none">✦</span>
        {open ? "Close assistant" : "Ask the data"}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.aside
            role="dialog"
            aria-label="AI assistant"
            initial={reduceMotion ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 40, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-20 right-5 z-[900] flex max-h-[70vh] w-[min(400px,calc(100vw-2.5rem))] flex-col border border-line bg-surface shadow-[0_8px_40px_rgba(4,8,14,0.7)]"
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
                  Local AI · {model}
                </p>
                <p className="font-display text-lg font-bold tracking-wide">
                  Ask the data
                </p>
              </div>
              <span
                className="border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                style={
                  role === "analyst"
                    ? { borderColor: TIER_COLOR.mark, color: TIER_COLOR.text }
                    : { borderColor: "var(--line)", color: "var(--muted)" }
                }
              >
                {role === "analyst" ? "● Analyst" : "○ Public"}
              </span>
            </header>

            {health === "down" || health === "no-model" ? (
              <div className="p-4">
                <p className="text-sm leading-6 text-muted">
                  {health === "down" ? (
                    <>
                      The AI assistant runs in the <strong>local demo</strong>.
                      Clone the repo and run Ollama to try it — the deployed
                      site has no model behind it.
                    </>
                  ) : (
                    <>
                      Ollama is running but the <code className="font-mono">{model}</code>{" "}
                      model isn&apos;t pulled yet. Run{" "}
                      <code className="font-mono">ollama pull {model}</code>{" "}
                      and check again.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void checkHealth()}
                  className="mt-3 border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted hover:border-foreground hover:text-foreground"
                >
                  Check again
                </button>
              </div>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
                >
                  {messages.length === 0 ? (
                    <div>
                      <p className="text-sm leading-6 text-muted">
                        Ask about the fire districts, flood zones, or polling
                        locations on this map. Answers come from a local
                        model reading the county data
                        {role === "public"
                          ? " — public tier, so restricted fields aren't in its context."
                          : ", including analyst-tier fields for your session."}
                      </p>
                      <div className="mt-4 space-y-2">
                        {STARTERS.map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => void send(question)}
                            className="block w-full border border-line bg-background px-3 py-2 text-left text-xs leading-5 text-muted transition-colors duration-150 hover:border-foreground hover:text-foreground"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, i) => (
                      <div key={i}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                          {message.role === "user" ? "You" : "Assistant"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                          {message.content}
                          {message.role === "assistant" &&
                          streaming &&
                          i === messages.length - 1 ? (
                            <span aria-hidden="true" className="animate-pulse">
                              ▍
                            </span>
                          ) : null}
                        </p>
                      </div>
                    ))
                  )}
                  {failed ? (
                    <p className="border border-danger/60 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-danger">
                      Generation failed — is Ollama still running?
                    </p>
                  ) : null}
                </div>
                <form
                  className="flex gap-2 border-t border-line p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <label htmlFor="chat-input" className="sr-only">
                    Ask a question about the county data
                  </label>
                  <input
                    id="chat-input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      health === "checking" ? "Checking Ollama…" : "Ask a question…"
                    }
                    disabled={health === "checking"}
                    className="min-w-0 flex-1 border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-faint"
                  />
                  <button
                    type="submit"
                    disabled={streaming || !input.trim()}
                    className="border border-foreground bg-foreground px-3 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-background transition-opacity disabled:opacity-40"
                  >
                    {streaming ? "…" : "Send"}
                  </button>
                </form>
              </>
            )}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
