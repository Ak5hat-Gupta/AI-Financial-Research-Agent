import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calculator, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { TickerInput } from "@/components/ui/TickerInput";
import { Card, ErrorBanner, Spinner, Stat } from "@/components/ui/primitives";
import { FcfAreaChart } from "@/components/charts/charts";
import { fmtCurrency, fmtNum, fmtPct } from "@/lib/format";
import type { DCFResult } from "@/lib/types";

interface Assumptions {
  growth_rate: number;
  terminal_growth: number;
  discount_rate: number;
  projection_years: number;
}

const DEFAULTS: Assumptions = {
  growth_rate: 0.1,
  terminal_growth: 0.025,
  discount_rate: 0.09,
  projection_years: 5,
};

export default function Valuation() {
  const [params] = useSearchParams();
  const [ticker, setTicker] = useState(params.get("ticker")?.toUpperCase() || "AAPL");
  const [live, setLive] = useState(false);
  const [a, setA] = useState<Assumptions>(DEFAULTS);
  const [result, setResult] = useState<DCFResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.post<DCFResult>(`/api/valuation/dcf?live=${live}`, { ticker, ...a });
      setResult(r.data);
    } catch (err) {
      setError(apiError(err, "Valuation failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upside = result?.upside_pct ?? null;
  const bullish = (upside ?? 0) >= 0;

  const chartData =
    result?.projections.map((p) => ({
      year: `Y${p.year}`,
      fcf: Math.round(p.fcf),
      pv: Math.round(p.present_value),
    })) ?? [];

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Inputs */}
        <Card className="h-fit space-y-5">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-brand" />
            <h2 className="font-semibold">DCF Inputs</h2>
          </div>

          <div>
            <span className="label">Ticker</span>
            <TickerInput value={ticker} onChange={setTicker} onSubmit={run} />
          </div>

          <Slider label="Near-term FCF growth" value={a.growth_rate} min={-0.1} max={0.4} step={0.005}
            onChange={(v) => setA({ ...a, growth_rate: v })} format={(v) => fmtPct(v * 100, 1)} />
          <Slider label="Terminal growth" value={a.terminal_growth} min={0} max={0.06} step={0.0025}
            onChange={(v) => setA({ ...a, terminal_growth: v })} format={(v) => fmtPct(v * 100, 2)} />
          <Slider label="Discount rate (WACC)" value={a.discount_rate} min={0.04} max={0.2} step={0.005}
            onChange={(v) => setA({ ...a, discount_rate: v })} format={(v) => fmtPct(v * 100, 1)} />
          <Slider label="Projection years" value={a.projection_years} min={3} max={10} step={1}
            onChange={(v) => setA({ ...a, projection_years: v })} format={(v) => `${v} yrs`} />

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-surface/40 px-3 py-2.5 text-sm">
            <span className="text-ink-muted">Use live market data</span>
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="h-4 w-4 accent-brand cursor-pointer" />
          </label>

          <button onClick={run} className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : <>Run valuation</>}
          </button>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {loading && !result ? (
            <Card><div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card>
          ) : result ? (
            <>
              <Card className={`border-l-4 ${bullish ? "border-l-bull" : "border-l-bear"}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-ink-muted">{result.company}</div>
                    <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                      {bullish ? <TrendingUp className="text-bull" size={24} /> : <TrendingDown className="text-bear" size={24} />}
                      <span className={bullish ? "text-bull" : "text-bear"}>{result.verdict}</span>
                    </div>
                  </div>
                  {upside !== null && (
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-ink-muted">Implied upside</div>
                      <div className={`text-3xl font-bold nums ${bullish ? "text-bull" : "text-bear"}`}>{fmtPct(upside)}</div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="Fair value / share" value={fmtCurrency(result.fair_value_per_share)} tone={bullish ? "bull" : "bear"} />
                <Stat label="Current price" value={fmtCurrency(result.current_price)} />
                <Stat label="Enterprise value" value={`$${fmtNum(result.enterprise_value / 1000, 1)}B`} sub="PV of FCF + terminal" />
                <Stat label="Equity value" value={`$${fmtNum(result.equity_value / 1000, 1)}B`} sub="EV − net debt" />
              </div>

              <Card>
                <h3 className="mb-4 font-semibold">Projected free cash flow</h3>
                <FcfAreaChart data={chartData} />
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-3 font-semibold">Projection detail</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                          <th className="pb-2">Year</th>
                          <th className="pb-2 text-right">FCF ($M)</th>
                          <th className="pb-2 text-right">Disc.</th>
                          <th className="pb-2 text-right">PV ($M)</th>
                        </tr>
                      </thead>
                      <tbody className="nums">
                        {result.projections.map((p) => (
                          <tr key={p.year} className="border-t border-line">
                            <td className="py-2">Y{p.year}</td>
                            <td className="py-2 text-right">{fmtNum(p.fcf, 0)}</td>
                            <td className="py-2 text-right text-ink-muted">{p.discount_factor.toFixed(3)}</td>
                            <td className="py-2 text-right">{fmtNum(p.present_value, 0)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-line font-semibold text-brand">
                          <td className="py-2">Terminal</td>
                          <td className="py-2 text-right">—</td>
                          <td className="py-2 text-right">—</td>
                          <td className="py-2 text-right">{fmtNum(result.pv_terminal_value, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-brand" />
                    <h3 className="font-semibold">Analyst commentary</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-muted">{result.commentary}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(result.assumptions).map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-line bg-surface/30 px-3 py-2">
                        <div className="text-ink-faint">{k.replace(/_/g, " ")}</div>
                        <div className="nums font-medium">{v === null ? "—" : fmtNum(Number(v), 3)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
        <span className="nums text-sm font-semibold text-brand">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-overlay accent-brand"
      />
    </div>
  );
}
