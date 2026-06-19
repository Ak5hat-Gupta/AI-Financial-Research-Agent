"use client";
import { useEffect, useState, useCallback } from "react";
import { Users, Sparkles } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Spinner, ErrorNote } from "@/components/ui";
import { Bars } from "@/components/charts";
import { money, num, millions } from "@/lib/format";
import type { Competitors } from "@/lib/types";

export default function CompetitorsPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [peers, setPeers] = useState("");
  const [res, setRes] = useState<Competitors | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = useCallback(async (tk: string, pl: string) => {
    if (!tk.trim()) return;
    setLoading(true); setErr("");
    try {
      const list = pl.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
      setRes((await api.post<Competitors>("/competitors?live=false", { ticker: tk, peers: list })).data);
    } catch (x) { setErr(apiErr(x, "Comparison failed")); } finally { setLoading(false); }
  }, []);

  useEffect(() => { const p = (new URLSearchParams(window.location.search).get("ticker") || "AAPL").toUpperCase(); setTicker(p); run(p, ""); }, [run]);

  const margin = res?.peers.map((p) => ({ ticker: p.ticker, value: p.net_margin })) ?? [];
  const pe = res?.peers.map((p) => ({ ticker: p.ticker, value: p.pe })) ?? [];

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div><label className="lbl">Target ticker</label><input className="field nums uppercase" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") run(ticker, peers); }} /></div>
          <div><label className="lbl">Peers (optional, comma-separated)</label><input className="field nums uppercase" placeholder="MSFT, GOOGL, AMZN" value={peers} onChange={(e) => setPeers(e.target.value.toUpperCase())} /></div>
          <button onClick={() => run(ticker, peers)} className="btn-primary" disabled={loading}>{loading ? <Spinner className="h-4 w-4" /> : <><Users size={16} /> Compare</>}</button>
        </div>
      </Card>
      {loading && !res ? <Card><div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card> : res && (
        <>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted"><th className="p-4">Company</th><th className="p-4 text-right">Price</th><th className="p-4 text-right">Mkt cap</th><th className="p-4 text-right">P/E</th><th className="p-4 text-right">Gross %</th><th className="p-4 text-right">Net %</th><th className="p-4 text-right">ROE %</th><th className="p-4 text-right">D/E</th></tr></thead>
              <tbody className="nums">{res.peers.map((p, i) => (<tr key={p.ticker} className={`border-b border-line/60 ${i === 0 ? "bg-brand/5" : ""}`}><td className="p-4"><span className="font-semibold">{p.ticker}</span>{i === 0 && <span className="chip ml-2 bg-brand/15 text-brand">target</span>}<div className="font-sans text-xs text-ink-faint">{p.company}</div></td><td className="p-4 text-right">{money(p.price)}</td><td className="p-4 text-right">{millions(p.market_cap)}</td><td className="p-4 text-right">{p.pe ? `${num(p.pe, 1)}×` : "—"}</td><td className="p-4 text-right">{p.gross_margin != null ? `${num(p.gross_margin, 1)}%` : "—"}</td><td className="p-4 text-right">{p.net_margin != null ? `${num(p.net_margin, 1)}%` : "—"}</td><td className="p-4 text-right">{p.roe != null ? `${num(p.roe, 1)}%` : "—"}</td><td className="p-4 text-right">{p.debt_to_equity != null ? `${num(p.debt_to_equity, 2)}×` : "—"}</td></tr>))}</tbody></table>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><h3 className="mb-4 font-semibold">Net margin (%)</h3><Bars data={margin} label="Net margin %" /></Card>
            <Card><h3 className="mb-4 font-semibold">P/E multiple (×)</h3><Bars data={pe} color="#3B82F6" label="P/E" /></Card>
          </div>
          <Card><div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-brand" /><h3 className="font-semibold">Competitive read</h3></div><p className="text-sm leading-relaxed text-ink-muted">{res.commentary}</p></Card>
        </>
      )}
    </div>
  );
}
