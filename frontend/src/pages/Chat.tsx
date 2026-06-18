import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { FileText, Quote, SendHorizonal, Sparkles } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Card, ErrorBanner, Spinner } from "@/components/ui/primitives";
import type { ChatMessage, DocumentItem } from "@/lib/types";

const SUGGESTIONS = [
  "Summarize the key risk factors.",
  "What were total revenue and net income?",
  "How did gross margin change year over year?",
  "What is management's forward guidance?",
];

export default function Chat() {
  const [params] = useSearchParams();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [docId, setDocId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<DocumentItem[]>("/api/documents").then((r) => {
      const ready = r.data.filter((d) => d.status === "ready");
      setDocs(ready);
      const fromQuery = params.get("doc");
      if (fromQuery) setDocId(Number(fromQuery));
      else if (ready.length) setDocId(ready[0].id);
    });
  }, [params]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const r = await api.post("/api/chat/ask", {
        message,
        document_id: docId,
        session_id: sessionId,
      });
      setSessionId(r.data.session_id);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: r.data.answer, citations: r.data.citations },
      ]);
    } catch (err) {
      setError(apiError(err, "Could not get an answer"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4 lg:h-[calc(100vh-10rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-ink-muted" />
          <select
            className="input max-w-xs py-2"
            value={docId ?? ""}
            onChange={(e) => {
              setDocId(e.target.value ? Number(e.target.value) : null);
              setSessionId(null);
              setMessages([]);
            }}
          >
            <option value="">All filings</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ticker ? `${d.ticker} — ` : ""}{d.company || d.filename}
              </option>
            ))}
          </select>
        </div>
        {docs.length === 0 && (
          <span className="text-xs text-warn">Upload a filing first for grounded answers.</span>
        )}
      </div>

      <ErrorBanner message={error} />

      <Card className="flex min-h-0 flex-1 flex-col p-0">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand">
                <Sparkles size={26} />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Ask anything about your filings</h3>
              <p className="mt-1 max-w-md text-sm text-ink-muted">
                Answers are grounded in the document text with page citations.
              </p>
              <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="cursor-pointer rounded-xl border border-line bg-surface/40 px-4 py-3 text-left text-sm text-ink-muted transition-colors hover:border-brand/40 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Bubble key={i} message={m} />)
          )}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <Spinner className="h-4 w-4 text-brand" /> Researching the filing…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-2 border-t border-line p-3"
        >
          <input
            className="input"
            placeholder="Ask about revenue, risks, margins, guidance…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn-primary px-4" disabled={busy || !input.trim()}>
            <SendHorizonal size={16} />
          </button>
        </form>
      </Card>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "order-2" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-brand text-base font-medium"
              : "border border-line bg-surface/50 text-ink"
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <div className="prose-chat space-y-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.citations.map((c, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-line bg-surface/30 px-3 py-2 text-xs text-ink-muted">
                <Quote size={13} className="mt-0.5 shrink-0 text-ink-faint" />
                <span>
                  <span className="font-medium text-accent">p.{c.page}</span> — {c.snippet}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
