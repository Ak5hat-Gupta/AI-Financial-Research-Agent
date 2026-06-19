"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Info, TriangleAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Stat, Empty, Spinner, ErrorNote } from "@/components/ui";
import { Donut } from "@/components/charts";
import { money, pct, pnl } from "@/lib/format";
import type { Portfolio, Rec } from "@/lib/types";

const REC: Record<Rec["type"], { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: "border-info/40 bg-info-soft text-info" },
  warning: { icon: TriangleAlert, cls: "border-warn/40 bg-warn-soft text-warn" },
  danger: { icon: AlertTriangle, cls: "border-bear/40 bg-bear-soft text-bear" },
  success: { icon: CheckCircle2, cls: "border-bull/40 bg-bull-soft text-bull" },
};

export default function PortfolioPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["portfolio"], queryFn: async () => (await api.get<Portfolio>("/portfolio/recommendations?live=false")).data });
  const [ticker, setTicker] = useState(""); const [shares, setShares] = useState(""); const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!ticker.trim() || !shares || !cost) return;
    setBusy(true); setErr("");
    try { await api.post("/portfolio/holdings", { ticker: ticker.toUpperCase(), shares: +shares, cost_basis: +cost }); setTicker(""); setShares(""); setCost(""); qc.invalidateQueries({ queryKey: ["portfolio"] }); }
    catch (x) { setErr(apiErr(x, "Could not add holding")); } finally { setBusy(false); }
  }
  async function remove(id: number) { await api.delete(`/portfolio/holdings/${id}`); qc.invalidateQueries({ queryKey: ["portfolio"] }); }

  const d = q.data;
  const pie = d?.allocation.map((a) => ({ label: a.label, value: a.value })) ?? [];

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div><label className="lbl">Ticker</label><input className="field nums uppercase" placeholder="AAPL" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} /></div>
          <div><label className="lbl">Shares</label><input type="number" min="0" step="any" className="field nums" placeholder="50" value={shares} onChange={(e) => setShares(e.target.value)} /></div>
          <div><label className="lbl">Avg cost / share</label><input type="number" min="0" step="any" className="field nums" placeholder="165.00" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
          <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <><Plus size={16} /> Add</>}</button>
        </form>
      </Card>

      {q.isLoading ? <Card><div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card> :
        !d || d.holdings.length === 0 ? <Empty icon={<Plus size={28} />} title="No holdings yet" desc="Add a position to see valuation, allocation and risk recommendations." /> : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Market value" value={money(d.total_value, 0)} />
              <Stat label="Cost basis" value={money(d.total_cost, 0)} />
              <Stat label="Total return" value={pct(d.total_gain_pct)} tone={d.total_gain_pct >= 0 ? "bull" : "bear"} />
              <Stat label="Positions" value={d.holdings.length} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted"><th className="p-4">Ticker</th><th className="p-4 text-right">Shares</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Price</th><th className="p-4 text-right">Value</th><th className="p-4 text-right">Return</th><th className="p-4"></th></tr></thead>
                  <tbody className="nums">{d.holdings.map((h) => (<tr key={h.id} className="border-b border-line/60"><td className="p-4 font-semibold">{h.ticker}</td><td className="p-4 text-right">{h.shares}</td><td className="p-4 text-right">{money(h.cost_basis)}</td><td className="p-4 text-right">{money(h.current_price)}</td><td className="p-4 text-right">{money(h.market_value, 0)}</td><td className={`p-4 text-right font-medium ${pnl(h.gain_pct)}`}>{pct(h.gain_pct)}</td><td className="p-4 text-right"><button onClick={() => remove(h.id)} aria-label="Remove" className="cursor-pointer rounded-lg p-1.5 text-ink-faint hover:bg-bear-soft hover:text-bear"><Trash2 size={14} /></button></td></tr>))}</tbody></table>
              </Card>
              <Card><h3 className="mb-2 font-semibold">Allocation</h3><Donut data={pie} /></Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card><h3 className="mb-3 font-semibold">Recommendations</h3><div className="space-y-2">{d.recommendations.map((r, i) => { const { icon: I, cls } = REC[r.type]; return (<div key={i} className={`flex gap-3 rounded-xl border p-3 ${cls}`}><I size={18} className="mt-0.5 shrink-0" /><div><div className="text-sm font-medium text-ink">{r.title}</div><div className="text-xs text-ink-muted">{r.detail}</div></div></div>); })}</div></Card>
              <Card><h3 className="mb-3 font-semibold">Strategist note</h3><p className="text-sm leading-relaxed text-ink-muted">{d.commentary}</p></Card>
            </div>
          </>
        )}
    </div>
  );
}
