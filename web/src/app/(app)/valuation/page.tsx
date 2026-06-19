"use client";
import { useEffect, useState, useCallback } from "react";
import { Calculator, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Stat, Spinner, ErrorNote } from "@/components/ui";
import { FcfArea } from "@/components/charts";
import { money, num, pct } from "@/lib/format";
import type { DCF } from "@/lib/types";

const D = { growth_rate: 0.1, terminal_growth: 0.025, discount_rate: 0.09, projection_years: 5 };

export default function Valuation() {
  const [ticker, setTicker] = useState("AAPL");
  const [a, setA] = useState(D);
  const [res, setRes] = useState<DCF | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = useCallback(async (tk: string, asm: typeof D) => {
    if (!tk.trim()) return;
    setLoading(true); setErr("");
    try { setRes((await api.post<DCF>("/valuation/dcf?live=false", { ticker: tk, ...asm })).data); }
    catch (x) { setErr(apiErr(x, "Valuation failed")); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const p = (new URLSearchParams(window.location.search).get("ticker") || "AAPL").toUpperCase();
    setTicker(p); run(p, D);
  }, [run]);

  const up = res?.upside_pct ?? null;
  const bull = (up ?? 0) >= 0;
  const chart = res?.projections.map((p) => ({ year: `Y${p.year}`, fcf: Math.round(p.fcf), pv: Math.round(p.present_value) })) ?? [];

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit space-y-5">
          <div className="flex items-center gap-2"><Calculator size={16} className="text-brand" /><h3 className="font-semibold">DCF inputs</h3></div>
          <div><label className="lbl">Ticker</label><input className="field nums uppercase" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") run(ticker, a); }} /></div>
          <Slider label="Near-term FCF growth" v={a.growth_rate} min={-0.1} max={0.4} step={0.005} on={(v) => setA({ ...a, growth_rate: v })} fmt={(v) => pct(v * 100, 1)} />
          <Slider label="Terminal growth" v={a.terminal_growth} min={0} max={0.06} step={0.0025} on={(v) => setA({ ...a, terminal_growth: v })} fmt={(v) => pct(v * 100, 2)} />
          <Slider label="Discount rate (WACC)" v={a.discount_rate} min={0.04} max={0.2} step={0.005} on={(v) => setA({ ...a, discount_rate: v })} fmt={(v) => pct(v * 100, 1)} />
          <Slider label="Projection years" v={a.projection_years} min={3} max={10} step={1} on={(v) => setA({ ...a, projection_years: v })} fmt={(v) => `${v} yrs`} />
          <button onClick={() => run(ticker, a)} className="btn-primary w-full" disabled={loading}>{loading ? <Spinner className="h-4 w-4" /> : "Run valuation"}</button>
        </Card>

        <div className="space-y-6">
          {loading && !res ? <Card><div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card> : res && (
            <>
              <Card className={`border-l-4 ${bull ? "border-l-bull" : "border-l-bear"}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div><div className="text-xs uppercase tracking-wide text-ink-muted">{res.company}</div><div className="mt-1 flex items-center gap-2 text-2xl font-semibold">{bull ? <TrendingUp className="text-bull" size={24} /> : <TrendingDown className="text-bear" size={24} />}<span className={bull ? "text-bull" : "text-bear"}>{res.verdict}</span></div></div>
                  {up != null && <div className="text-right"><div className="text-xs uppercase tracking-wide text-ink-muted">Implied upside</div><div className={`nums text-3xl font-bold ${bull ? "text-bull" : "text-bear"}`}>{pct(up)}</div></div>}
                </div>
              </Card>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="Fair value / share" value={money(res.fair_value_per_share)} tone={bull ? "bull" : "bear"} />
                <Stat label="Current price" value={money(res.current_price)} />
                <Stat label="Enterprise value" value={`$${num(res.enterprise_value / 1000, 1)}B`} />
                <Stat label="Equity value" value={`$${num(res.equity_value / 1000, 1)}B`} />
              </div>
              <Card><h3 className="mb-4 font-semibold">Projected free cash flow</h3><FcfArea data={chart} /></Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-3 font-semibold">Projection detail</h3>
                  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-ink-muted"><th className="pb-2">Year</th><th className="pb-2 text-right">FCF ($M)</th><th className="pb-2 text-right">Disc.</th><th className="pb-2 text-right">PV ($M)</th></tr></thead>
                    <tbody className="nums">{res.projections.map((p) => (<tr key={p.year} className="border-t border-line"><td className="py-2">Y{p.year}</td><td className="py-2 text-right">{num(p.fcf, 0)}</td><td className="py-2 text-right text-ink-muted">{p.discount_factor.toFixed(3)}</td><td className="py-2 text-right">{num(p.present_value, 0)}</td></tr>))}
                      <tr className="border-t border-line font-semibold text-brand"><td className="py-2">Terminal</td><td className="py-2 text-right">—</td><td className="py-2 text-right">—</td><td className="py-2 text-right">{num(res.pv_terminal_value, 0)}</td></tr></tbody></table></div>
                </Card>
                <Card><div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-brand" /><h3 className="font-semibold">Commentary</h3></div><p className="text-sm leading-relaxed text-ink-muted">{res.commentary}</p></Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, v, min, max, step, on, fmt }: { label: string; v: number; min: number; max: number; step: number; on: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span><span className="nums text-sm font-semibold text-brand">{fmt(v)}</span></div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-overlay accent-brand" />
    </div>
  );
}
