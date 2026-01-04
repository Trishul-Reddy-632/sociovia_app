// src/components/ChatWidget.tsx
import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

/**
 * ChatWidget
 * - Mobile: full-screen slide-up panel
 * - Desktop: floating bubble that expands into a panel
 * - Agentic quick actions (preset tasks) included
 *
 * Props:
 *  - initialOpen?: boolean
 *  - onSend?: (payload: { text: string; type?: string; meta?: any }) => Promise<void> | void
 *  - storageKey?: string  // localStorage key for persistence
 */
export type ChatWidgetProps = {
  initialOpen?: boolean;
  onSend?: (payload: { text: string; type?: string; meta?: any }) => Promise<void> | void;
  storageKey?: string;
};

type Message = { id: string; from: "user" | "bot" | "system"; text: string; time: number; meta?: any };

const AGENT_TASKS = [
  { id: "answer_dashboard", label: "Answer dashboard queries", example: "Show me last 7 days spend for Workspace 12." },
  { id: "understand_campaign", label: "Understand campaign data", example: "Explain why campaign X CTR dropped." },
  { id: "navigate_pages", label: "Navigate pages", example: "Take me to Meta Ads > Billing." },
  { id: "read_guides", label: "Read quick guides", example: "Show me a quick guide on CPM optimization." },
  { id: "explain", label: "Give explanations", example: "What is CPM and how is it calculated?" },
  { id: "raise_ticket", label: "Raise tickets", example: "Create support ticket: billing discrepancy for workspace 4." },
];

export default function ChatWidget({ initialOpen = false, onSend, storageKey = "sv_chat_messages" }: ChatWidgetProps) {
  const [open, setOpen] = useState<boolean>(initialOpen);
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load persisted messages
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  // Persist messages on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
    // auto-scroll
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, storageKey]);

  // simple helper to push message
  const pushMessage = (m: Message) => setMessages((prev) => [...prev, m]);

  // Default demo bot reply (replace with real backend)
  async function demoBackendReply(userText: string) {
    setTyping(true);
    // simulate processing
    await new Promise((r) => setTimeout(r, 700));
    pushMessage({
      id: `bot_${Date.now()}`,
      from: "bot",
      text: `Agent: received — "${userText}". (demo reply)`,
      time: Date.now(),
    });
    setTyping(false);
  }

  // Combined send handler
  async function handleSend(payload: { text: string; type?: string; meta?: any }) {
    const { text, type, meta } = payload;
    if (!text || !text.trim()) return;
    const trimmed = text.trim();
    const userMsg: Message = { id: `u_${Date.now()}`, from: "user", text: trimmed, time: Date.now(), meta: { type, ...meta } };
    pushMessage(userMsg);
    setInput("");
    setIsSending(true);

    try {
      // give parent a chance to handle send (API, websocket)
      const maybePromise = onSend?.({ text: trimmed, type: type ?? "user", meta });
      if (maybePromise instanceof Promise) await maybePromise;

      // if parent didn't handle response streaming, call demo backend or leave it to parent
      if (!onSend) {
        await demoBackendReply(trimmed);
      }
    } catch (err) {
      console.error("onSend handler failed", err);
      pushMessage({ id: `syserr_${Date.now()}`, from: "system", text: "Failed to send message. Try again.", time: Date.now() });
    } finally {
      setIsSending(false);
    }
  }

  // keyboard send
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend({ text: input });
    }
  }

  // quick-action tap
  function handleTaskTap(taskId: string) {
    const t = AGENT_TASKS.find((x) => x.id === taskId);
    if (!t) return;
    // For agentic behavior we send a structured payload so backend knows the intent
    handleSend({ text: t.example, type: "agent_task", meta: { task: taskId } });
    // optionally open full panel on mobile
    if (!open) setOpen(true);
  }

  // mobile detection (simple)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <>
      {/* PANEL (mobile: full screen drawer, desktop: floating panel) */}
      <div
        className={`fixed z-50 right-6 bottom-6 flex flex-col items-end ${
          open ? "" : ""
        }`}
        aria-live="polite"
      >
        {/* Fullscreen overlay on mobile when open */}
        {isMobile && open && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}

        <div
          className={`transform transition-transform duration-200 ${open ? "translate-y-0" : "translate-y-6"} `}
          style={{ zIndex: 60 }}
        >
          {/* Chat panel */}
          <div
            role="dialog"
            aria-label="Chat assistant"
            className={`flex flex-col ${
              isMobile ? "w-screen h-screen max-h-screen rounded-t-xl pb-safe" : "w-80 max-h-[560px] rounded-xl"
            } overflow-hidden bg-white shadow-lg`}
            style={{
              // desktop drop shadow + mobile full-height feel
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-sm font-semibold">Assistant</div>
                  <div className="text-xs text-muted-foreground">Agentic helper — ask or pick a task</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSending && <div className="text-xs text-muted-foreground mr-2">Sending…</div>}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="rounded p-1 hover:bg-muted/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick tasks: compact row */}
            <div className="px-3 py-2 border-b bg-gray-50">
              <div className="flex gap-2 flex-wrap">
                {AGENT_TASKS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTaskTap(t.id)}
                    className="text-xs px-3 py-1.5 rounded-full border bg-white hover:shadow-sm flex items-center gap-2"
                    title={t.label}
                    aria-label={t.label}
                  >
                    <span className="whitespace-nowrap">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 120 }}>
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Hi — I can answer dashboard queries, explain metrics, navigate pages, or raise tickets. Try a quick task above.
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-md text-sm ${
                      m.from === "user" ? "bg-indigo-50 text-right" : m.from === "bot" ? "bg-gray-100" : "bg-yellow-50"
                    }`}
                  >
                    {m.text}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(m.time).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}

              {typing && <div className="text-sm text-muted-foreground">Agent is typing…</div>}
            </div>

            {/* Input area */}
            <div className="px-3 py-2 border-t bg-white">
              <div className="flex items-center gap-2">
                <input
                  aria-label="Type a message"
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  placeholder="Ask me about spends, campaigns or raise a ticket..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => handleSend({ text: input })}
                  disabled={isSending || !input.trim()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* small helper row (mobile) */}
              <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                <div>Press Enter to send</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // quick example: show help screen (system message)
                      pushMessage({ id: `sys_${Date.now()}`, from: "system", text: "Tip: Try \"Show spend for last 7 days\".", time: Date.now() });
                    }}
                    className="text-xs underline"
                  >
                    Tip
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating toggle (only show when panel closed on desktop; mobile uses full-screen panel toggle too) */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            aria-label="Open assistant"
            className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:scale-105 transition-transform"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
}
