"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Link from "next/link";
import { UploadCloud, FileText, Trash2, MessagesSquare } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Empty, ErrorNote, Badge, Skeleton, Spinner } from "@/components/ui";
import { compact, ago } from "@/lib/format";
import type { DocumentItem } from "@/lib/types";

export default function Documents() {
  const qc = useQueryClient();
  const docs = useQuery({ queryKey: ["docs"], queryFn: async () => (await api.get<DocumentItem[]>("/documents")).data });
  const [ticker, setTicker] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setErr(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("ticker", ticker); fd.append("company", company); fd.append("doc_type", "10-K");
      await api.post("/documents", fd);
      setTicker(""); setCompany("");
      qc.invalidateQueries({ queryKey: ["docs"] });
    } catch (x) { setErr(apiErr(x, "Upload failed")); } finally { setBusy(false); }
  }
  async function remove(id: number) { await api.delete(`/documents/${id}`); qc.invalidateQueries({ queryKey: ["docs"] }); }

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="lbl">Ticker (optional)</label><input className="field nums uppercase" value={ticker} placeholder="AAPL" onChange={(e) => setTicker(e.target.value.toUpperCase())} /></div>
          <div><label className="lbl">Company (optional)</label><input className="field" value={company} placeholder="Apple Inc." onChange={(e) => setCompany(e.target.value)} /></div>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
          onClick={() => fileRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${drag ? "border-brand bg-brand/5" : "border-line bg-surface/30 hover:border-ink-faint"}`}>
          {busy ? <><Spinner className="h-8 w-8 text-brand" /><p className="mt-3 text-sm text-ink-muted">Parsing, chunking & indexing…</p></> :
            <><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand"><UploadCloud size={24} /></span><p className="mt-3 text-sm font-medium">Drop a 10-K / annual report</p><p className="text-xs text-ink-muted">PDF or TXT · up to 25MB · click to browse</p></>}
          <input ref={fileRef} type="file" accept=".pdf,.txt,.htm,.html" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
      </Card>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Your filings ({docs.data?.length ?? 0})</h3>
      {docs.isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> :
        !docs.data?.length ? <Empty icon={<FileText size={28} />} title="No filings yet" desc="Upload a 10-K to chat with it and generate summaries." /> :
        <div className="space-y-3">{docs.data.map((d) => (
          <Card key={d.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info/10 text-info"><FileText size={18} /></span>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate font-medium">{d.company || d.filename}</span>{d.ticker && <span className="chip nums bg-surface-overlay/70 text-ink-muted">{d.ticker}</span>}<Badge status={d.status} /></div>
                <div className="mt-0.5 text-xs text-ink-faint">{d.doc_type} · {d.page_count} pages · {compact(d.char_count)} chars · {ago(d.created_at)}</div>
                {d.summary && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{d.summary}</p>}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2"><Link href={`/research?doc=${d.id}`} className="btn-ghost px-3 py-2 text-xs"><MessagesSquare size={14} /> Chat</Link><button onClick={() => remove(d.id)} aria-label="Delete" className="cursor-pointer rounded-lg border border-line p-2 text-ink-faint hover:border-bear/40 hover:text-bear"><Trash2 size={14} /></button></div>
          </Card>
        ))}</div>}
    </div>
  );
}
