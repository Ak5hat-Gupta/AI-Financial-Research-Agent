"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, SendHorizonal, Quote, FileText, Lightbulb } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Spinner, ErrorNote } from "@/components/ui";
import type { ChatMsg, DocumentItem } from "@/lib/types";

const SUGGESTIONS = [
  "Summarize the key risk factors.",
  "What were total revenue and net income?",
  "How did gross margin change year over year?",
  "What is management's forward guidance?",
  "Explain the main drivers of cash flow.",
];

export default function Research() {
  const docsQ = useQuery({ queryKey: ["docs"], queryFn: async () => (await api.get<DocumentItem[]>("/documents")).data });
  const [docId, setDocId] = useState<number | null>(null);
  const [session, setSession] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("doc");
    if (p) setDocId(Number(p));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const ready = (docsQ.data ?? []).filter((d) => d.status === "ready");

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setErr(""); setInput(""); setMsgs((m) => [...m, { role: "user", content: message }]); setBusy(true);
    try {
      const r = await api.post("/chat/ask", { message, document_id: docId, session_id: session });
      setSession(r.data.session_id);
      setMsgs((m) => [...m, { role: "assistant", content: r.data.answer, citations: r.data.citations }]);
    } catch (x) { setErr(apiErr(x, "Could not get an answer")); } finally { setBusy(false); }
  }

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_240px]">
      {/* Left: scope */}
      <Card className="hidden flex-col p-4 lg:flex">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Filings</h3>
        <button onClick={() => { setDocId(null); setSession(null); setMsgs([]); }} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${docId === null ? "bg-brand/15 text-brand" : "text-ink-muted hover:bg-surface-overlay/60"}`}>All filings</button>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {ready.map((d) => (
            <button key={d.id} onClick={() => { setDocId(d.id); setSession(null); setMsgs([]); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${docId === d.id ? "bg-brand/15 text-brand" : "text-ink-muted hover:bg-surface-overlay/60"}`}>
              <FileText size={14} className="shrink-0" /><span className="truncate">{d.ticker || d.company || d.filename}</span>
            </button>
          ))}
          {ready.length === 0 && <p className="px-3 text-xs text-ink-faint">No indexed filings yet.</p>}
        </div>
      </Card>

      {/* Center: chat */}
      <Card className="flex min-h-0 flex-col p-0">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <ErrorNote message={err} />
          {msgs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand"><Sparkles size={26} /></span>
              <h3 className="mt-4 text-lg font-semibold">Ask your analyst</h3>
              <p className="mt-1 max-w-md text-sm text-ink-muted">Answers are grounded in your filings with page citations.</p>
            </div>
          ) : msgs.map((m, i) => <Bubble key={i} m={m} />)}
          {busy && <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner className="h-4 w-4 text-brand" /> Researching…</div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-line p-3">
          <input className="field" placeholder="Ask about revenue, risks, margins, guidance…" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
          <button className="btn-primary px-4" disabled={busy || !input.trim()}><SendHorizonal size={16} /></button>
        </form>
      </Card>

      {/* Right: suggestions */}
      <Card className="hidden flex-col p-4 lg:flex">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted"><Lightbulb size={13} /> Suggested</h3>
        <div className="space-y-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="w-full rounded-lg border border-line bg-surface/40 px-3 py-2.5 text-left text-xs text-ink-muted transition-colors hover:border-brand/40 hover:text-ink">{s}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Bubble({ m }: { m: ChatMsg }) {
  const user = m.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${user ? "bg-brand-grad font-medium text-white shadow-glow" : "border border-line bg-surface/70"}`}>
          {user ? m.content : <div className="prose-sm space-y-2"><ReactMarkdown>{m.content}</ReactMarkdown></div>}
        </div>
        {m.citations && m.citations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {m.citations.map((c, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-line bg-surface/30 px-3 py-2 text-xs text-ink-muted"><Quote size={13} className="mt-0.5 shrink-0 text-ink-faint" /><span><span className="font-medium text-info">p.{c.page}</span> — {c.snippet}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
