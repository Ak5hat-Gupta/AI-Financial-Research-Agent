import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, MessagesSquare, Trash2, UploadCloud } from "lucide-react";
import { api, apiError } from "@/lib/api";
import {
  Card,
  EmptyState,
  ErrorBanner,
  SkeletonBlock,
  Spinner,
  StatusBadge,
} from "@/components/ui/primitives";
import { fmtCompact, timeAgo } from "@/lib/format";
import type { DocumentItem } from "@/lib/types";

export default function Documents() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ticker, setTicker] = useState("");
  const [company, setCompany] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const r = await api.get<DocumentItem[]>("/api/documents");
    setDocs(r.data);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("ticker", ticker);
      fd.append("company", company);
      fd.append("doc_type", "10-K");
      await api.post("/api/documents", fd);
      setTicker("");
      setCompany("");
      await refresh();
    } catch (err) {
      setError(apiError(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: number) {
    await api.delete(`/api/documents/${id}`);
    setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="t" className="label">Ticker (optional)</label>
            <input id="t" className="input nums uppercase" value={ticker} placeholder="AAPL"
              onChange={(e) => setTicker(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="c" className="label">Company (optional)</label>
            <input id="c" className="input" value={company} placeholder="Apple Inc."
              onChange={(e) => setCompany(e.target.value)} />
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          onClick={() => fileRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragOver ? "border-brand bg-brand/5" : "border-line bg-surface/30 hover:border-ink-faint"
          }`}
        >
          {uploading ? (
            <>
              <Spinner className="h-8 w-8 text-brand" />
              <p className="mt-3 text-sm text-ink-muted">Parsing, chunking & indexing…</p>
            </>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand">
                <UploadCloud size={24} />
              </span>
              <p className="mt-3 text-sm font-medium">Drop a 10-K / annual report here</p>
              <p className="text-xs text-ink-muted">PDF or TXT · up to 25MB · click to browse</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.htm,.html"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Your filings ({docs.length})
        </h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title="No filings yet"
            description="Upload a 10-K above to start chatting with it and generating summaries."
          />
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <Card key={d.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{d.company || d.filename}</span>
                      {d.ticker && <span className="chip bg-surface-overlay/70 text-ink-muted nums">{d.ticker}</span>}
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-ink-faint">
                      {d.doc_type} · {d.page_count} pages · {fmtCompact(d.char_count)} chars · {timeAgo(d.created_at)}
                    </div>
                    {d.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{d.summary}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link to={`/chat?doc=${d.id}`} className="btn-ghost px-3 py-2 text-xs">
                    <MessagesSquare size={14} /> Chat
                  </Link>
                  <button
                    onClick={() => remove(d.id)}
                    className="cursor-pointer rounded-lg border border-line p-2 text-ink-faint transition-colors hover:border-bear/40 hover:text-bear"
                    aria-label="Delete filing"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
