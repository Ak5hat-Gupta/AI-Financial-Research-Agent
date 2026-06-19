"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScrollText, Sparkles, ArrowRight } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Empty, ErrorNote, Badge, Spinner, Skeleton } from "@/components/ui";
import { money, pct, ago } from "@/lib/format";
import type { MemoResponse } from "@/lib/memo";

export default function Memos() {
  const qc = useQueryClient();
  const router = useRouter();
  const memos = useQuery({ queryKey: ["memos"], queryFn: async () => (await api.get<MemoResponse[]>("/memo")).data });
  const [ticker, setTicker] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    if (!ticker.trim()) return;
    setBusy(true); setErr("");
    try {
      const m = (await api.post<MemoResponse>("/memo?live=false", { ticker: ticker.toUpperCase() })).data;
      qc.invalidateQueries({ queryKey: ["memos"] });
      router.push(`/memos/${m.id}`);
    } catch (x) { setErr(apiErr(x, "Could not generate memo")); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="lbl">Generate an investment memo</label>
            <input className="field nums uppercase" placeholder="Ticker, e.g. AAPL" value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") generate(); }} />
          </div>
          <button onClick={generate} className="btn-primary" disabled={busy}>
            {busy ? <><Spinner className="h-4 w-4" /> Generating…</> : <><Sparkles size={16} /> Generate memo</>}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Assembles fundamentals, ratios, a DCF, peer comps and sentiment into a 10-section institutional memo with PDF export.</p>
      </Card>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Saved memos ({memos.data?.length ?? 0})</h3>
      {memos.isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div> :
        !memos.data?.length ? <Empty icon={<ScrollText size={28} />} title="No memos yet" desc="Generate your first institutional investment memo above." /> :
        <div className="space-y-3">{memos.data.map((m) => (
          <button key={m.id} onClick={() => router.push(`/memos/${m.id}`)} className="group glass flex w-full items-center justify-between p-4 text-left transition-colors hover:border-brand/40">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><ScrollText size={18} /></span>
              <div><div className="flex items-center gap-2"><span className="nums font-semibold">{m.ticker}</span><Badge status={m.rating === "Buy" ? "positive" : m.rating === "Sell" ? "negative" : "neutral"} /></div><div className="text-xs text-ink-faint">{m.company} · {ago(m.created_at)}</div></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right"><div className="nums text-sm font-semibold">{money(m.target_price)}</div><div className={`text-xs ${(m.upside_pct ?? 0) >= 0 ? "text-bull" : "text-bear"}`}>{pct(m.upside_pct)} target</div></div>
              <ArrowRight size={16} className="text-ink-faint group-hover:text-brand" />
            </div>
          </button>
        ))}</div>}
    </div>
  );
}
