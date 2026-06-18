import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Users } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { TickerInput } from "@/components/ui/TickerInput";
import { Card, ErrorBanner, Spinner } from "@/components/ui/primitives";
import { PeerBarChart } from "@/components/charts/charts";
import { fmtMillions, fmtNum } from "@/lib/format";
import type { CompetitorResult } from "@/lib/types";

export default function Competitors() {
  const [params] = useSearchParams();
  const [ticker, setTicker] = useState(params.get("ticker")?.toUpperCase() || "AAPL");
  const [peers, setPeers] = useState("");
  const [live, setLive] = useState(false);
  const [result, setResult] = useState<CompetitorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError("");
    try {
      const peerList = peers.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
      const r = await api.post<CompetitorResult>(`/api/competitors?live=${live}`, {
        ticker,
        peers: peerList,
      });
      setResult(r.data);
    } catch (err) {
      setError(apiError(err, "Comparison failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const peColor = "#38BDF8";
  const marginData = result?.peers.map((p) => ({ ticker: p.ticker, value: p.net_margin })) ?? [];
  const peData = result?.peers.map((p) => ({ ticker: p.ticker, value: p.pe })) ?? [];

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <span className="label">Target ticker</span>
            <TickerInput value={ticker} onChange={setTicker} onSubmit={run} />
          </div>
          <div>
            <label htmlFor="peers" className="label">Peers (comma-separated, optional)</label>
            <input id="peers" className="input uppercase nums" placeholder="MSFT, GOOGL, AMZN"
              value={peers} onChange={(e) => setPeers(e.target.value.toUpperCase())} />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="h-4 w-4 accent-brand cursor-pointer" />
              Live
            </label>
            <button onClick={run} className="btn-primary" disabled={loading}>
              {loading ? <Spinner className="h-4 w-4" /> : <><Users size={16} /> Compare</>}
            </button>
          </div>
        </div>
      </Card>

      {loading && !result ? (
        <Card><div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card>
      ) : result ? (
        <>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="p-4">Company</th>
                  <th className="p-4 text-right">Price</th>
                  <th className="p-4 text-right">Mkt cap</th>
                  <th className="p-4 text-right">P/E</th>
                  <th className="p-4 text-right">Gross %</th>
                  <th className="p-4 text-right">Net %</th>
                  <th className="p-4 text-right">ROE %</th>
                  <th className="p-4 text-right">D/E</th>
                </tr>
              </thead>
              <tbody className="nums">
                {result.peers.map((p, i) => (
                  <tr key={p.ticker} className={`border-b border-line/60 ${i === 0 ? "bg-brand/5" : ""}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.ticker}</span>
                        {i === 0 && <span className="chip bg-brand/15 text-brand">target</span>}
                      </div>
                      <div className="font-sans text-xs text-ink-faint">{p.company}</div>
                    </td>
                    <td className="p-4 text-right">{p.price ? `$${fmtNum(p.price)}` : "—"}</td>
                    <td className="p-4 text-right">{fmtMillions(p.market_cap)}</td>
                    <td className="p-4 text-right">{p.pe ? `${fmtNum(p.pe, 1)}×` : "—"}</td>
                    <td className="p-4 text-right">{p.gross_margin != null ? `${fmtNum(p.gross_margin, 1)}%` : "—"}</td>
                    <td className="p-4 text-right">{p.net_margin != null ? `${fmtNum(p.net_margin, 1)}%` : "—"}</td>
                    <td className="p-4 text-right">{p.roe != null ? `${fmtNum(p.roe, 1)}%` : "—"}</td>
                    <td className="p-4 text-right">{p.debt_to_equity != null ? `${fmtNum(p.debt_to_equity, 2)}×` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 font-semibold">Net margin (%)</h3>
              <PeerBarChart data={marginData} label="Net margin %" />
            </Card>
            <Card>
              <h3 className="mb-4 font-semibold">P/E multiple (×)</h3>
              <PeerBarChart data={peData} label="P/E" color={peColor} />
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-brand" />
              <h3 className="font-semibold">Competitive read</h3>
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{result.commentary}</p>
          </Card>
        </>
      ) : null}
    </div>
  );
}
