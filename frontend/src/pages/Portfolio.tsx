import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Plus, Trash2, TriangleAlert } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Card, EmptyState, ErrorBanner, Spinner, Stat } from "@/components/ui/primitives";
import { AllocationPie } from "@/components/charts/charts";
import { fmtCurrency, fmtPct, pnlColor } from "@/lib/format";
import type { PortfolioResult, Recommendation } from "@/lib/types";

const REC_STYLES: Record<Recommendation["type"], { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: "border-accent/40 bg-accent/5 text-accent" },
  warning: { icon: TriangleAlert, cls: "border-warn/40 bg-warn/5 text-warn" },
  danger: { icon: AlertTriangle, cls: "border-bear/40 bg-bear/5 text-bear" },
  success: { icon: CheckCircle2, cls: "border-bull/40 bg-bull/5 text-bull" },
};

export default function Portfolio() {
  const [data, setData] = useState<PortfolioResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [adding, setAdding] = useState(false);

  async function refresh() {
    const r = await api.get<PortfolioResult>("/api/portfolio/recommendations?live=false");
    setData(r.data);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim() || !shares || !cost) return;
    setAdding(true);
    setError("");
    try {
      await api.post("/api/portfolio/holdings", {
        ticker: ticker.toUpperCase(),
        shares: Number(shares),
        cost_basis: Number(cost),
      });
      setTicker(""); setShares(""); setCost("");
      await refresh();
    } catch (err) {
      setError(apiError(err, "Could not add holding"));
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: number) {
    await api.delete(`/api/portfolio/holdings/${id}`);
    await refresh();
  }

  const pie = data?.allocation.map((a) => ({ label: a.label, value: a.value })) ?? [];

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <Card>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="pt" className="label">Ticker</label>
            <input id="pt" className="input nums uppercase" placeholder="AAPL" value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())} />
          </div>
          <div>
            <label htmlFor="ps" className="label">Shares</label>
            <input id="ps" type="number" min="0" step="any" className="input nums" placeholder="50" value={shares}
              onChange={(e) => setShares(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pc" className="label">Avg cost / share</label>
            <input id="pc" type="number" min="0" step="any" className="input nums" placeholder="165.00" value={cost}
              onChange={(e) => setCost(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={adding}>
            {adding ? <Spinner className="h-4 w-4" /> : <><Plus size={16} /> Add</>}
          </button>
        </form>
      </Card>

      {loading ? (
        <Card><div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card>
      ) : !data || data.holdings.length === 0 ? (
        <EmptyState
          icon={<Plus size={28} />}
          title="No holdings yet"
          description="Add a position above to see live valuation, allocation and risk recommendations."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Market value" value={fmtCurrency(data.total_value, 0)} />
            <Stat label="Cost basis" value={fmtCurrency(data.total_cost, 0)} />
            <Stat
              label="Total return"
              value={fmtPct(data.total_gain_pct)}
              tone={data.total_gain_pct >= 0 ? "bull" : "bear"}
            />
            <Stat label="Positions" value={data.holdings.length} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="p-4">Ticker</th>
                    <th className="p-4 text-right">Shares</th>
                    <th className="p-4 text-right">Cost</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-right">Value</th>
                    <th className="p-4 text-right">Return</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="nums">
                  {data.holdings.map((h) => (
                    <tr key={h.id} className="border-b border-line/60">
                      <td className="p-4 font-semibold">{h.ticker}</td>
                      <td className="p-4 text-right">{h.shares}</td>
                      <td className="p-4 text-right">{fmtCurrency(h.cost_basis)}</td>
                      <td className="p-4 text-right">{fmtCurrency(h.current_price)}</td>
                      <td className="p-4 text-right">{fmtCurrency(h.market_value, 0)}</td>
                      <td className={`p-4 text-right font-medium ${pnlColor(h.gain_pct)}`}>{fmtPct(h.gain_pct)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => remove(h.id)}
                          className="cursor-pointer rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-bear/15 hover:text-bear"
                          aria-label={`Remove ${h.ticker}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <h3 className="mb-2 font-semibold">Allocation</h3>
              <AllocationPie data={pie} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-semibold">Recommendations</h3>
              <div className="space-y-2">
                {data.recommendations.map((r, i) => {
                  const { icon: Icon, cls } = REC_STYLES[r.type];
                  return (
                    <div key={i} className={`flex gap-3 rounded-xl border p-3 ${cls}`}>
                      <Icon size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-ink">{r.title}</div>
                        <div className="text-xs text-ink-muted">{r.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <h3 className="mb-3 font-semibold">Strategist note</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{data.commentary}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
