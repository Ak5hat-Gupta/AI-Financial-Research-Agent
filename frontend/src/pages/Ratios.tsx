import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Scale, Sparkles } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { TickerInput } from "@/components/ui/TickerInput";
import { Card, ErrorBanner, Spinner } from "@/components/ui/primitives";
import { fmtNum } from "@/lib/format";
import type { RatioMetric, RatioResult } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  good: "bg-bull",
  fair: "bg-warn",
  weak: "bg-bear",
  "n/a": "bg-ink-faint",
};

export default function Ratios() {
  const [params] = useSearchParams();
  const [ticker, setTicker] = useState(params.get("ticker")?.toUpperCase() || "MSFT");
  const [live, setLive] = useState(false);
  const [result, setResult] = useState<RatioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.post<RatioResult>(`/api/ratios?live=${live}`, { ticker });
      setResult(r.data);
    } catch (err) {
      setError(apiError(err, "Ratio analysis failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <span className="label">Ticker</span>
            <TickerInput value={ticker} onChange={setTicker} onSubmit={run} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="h-4 w-4 accent-brand cursor-pointer" />
            Live data
          </label>
          <button onClick={run} className="btn-primary" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : <><Scale size={16} /> Analyze</>}
          </button>
        </div>
      </Card>

      {loading && !result ? (
        <Card><div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card>
      ) : result ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="flex flex-col items-center justify-center text-center">
              <HealthGauge score={result.health_score} />
              <div className="mt-3 text-sm font-medium">{result.company}</div>
              <div className="text-xs text-ink-faint">Financial health score</div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-brand" />
                <h3 className="font-semibold">Commentary</h3>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted">{result.commentary}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <Legend color="bg-bull" label="Strong" />
                <Legend color="bg-warn" label="Fair" />
                <Legend color="bg-bear" label="Weak" />
                <Legend color="bg-ink-faint" label="N/A" />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.groups.map((g) => (
              <Card key={g.name}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{g.name}</h3>
                <ul className="space-y-3">
                  {g.metrics.map((m) => <MetricRow key={m.label} m={m} />)}
                </ul>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricRow({ m }: { m: RatioMetric }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[m.status]}`} />
        <span className="text-sm">{m.label}</span>
      </div>
      <div className="text-right">
        <div className="nums text-sm font-semibold">
          {m.value === null ? "—" : `${fmtNum(m.value, m.unit === "%" ? 1 : 2)}${m.unit === "%" ? "%" : m.unit === "x" ? "×" : ""}`}
        </div>
        <div className="text-[11px] text-ink-faint">target {m.benchmark}</div>
      </div>
    </li>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-ink-muted">
      <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
    </span>
  );
}

function HealthGauge({ score }: { score: number }) {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 75 ? "#22C55E" : score >= 55 ? "#10B981" : score >= 40 ? "#F59E0B" : "#F43F5E";
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1F2A3C" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="nums text-3xl font-bold" style={{ color }}>{fmtNum(score, 0)}</div>
          <div className="text-[11px] text-ink-faint">/ 100</div>
        </div>
      </div>
    </div>
  );
}
