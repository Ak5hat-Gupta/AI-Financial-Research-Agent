import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, Newspaper, Sparkles } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { TickerInput } from "@/components/ui/TickerInput";
import { Card, ErrorBanner, Spinner, StatusBadge } from "@/components/ui/primitives";
import { SentimentBars } from "@/components/charts/charts";
import { timeAgo } from "@/lib/format";
import type { SentimentResult } from "@/lib/types";

export default function Sentiment() {
  const [params] = useSearchParams();
  const [ticker, setTicker] = useState(params.get("ticker")?.toUpperCase() || "TSLA");
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.post<SentimentResult>("/api/sentiment?live=false", { ticker });
      setResult(r.data);
    } catch (err) {
      setError(apiError(err, "Sentiment analysis failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overallTone =
    result?.overall === "positive" ? "text-bull" : result?.overall === "negative" ? "text-bear" : "text-ink-muted";

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <span className="label">Ticker</span>
            <TickerInput value={ticker} onChange={setTicker} onSubmit={run} />
          </div>
          <button onClick={run} className="btn-primary" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : <><Newspaper size={16} /> Analyze tape</>}
          </button>
        </div>
      </Card>

      {loading && !result ? (
        <Card><div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card>
      ) : result ? (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center text-center">
              <div className="text-xs uppercase tracking-wide text-ink-muted">Overall sentiment</div>
              <div className={`mt-2 text-3xl font-bold capitalize ${overallTone}`}>{result.overall}</div>
              <div className="mt-1 nums text-sm text-ink-faint">score {result.score.toFixed(2)}</div>
            </Card>
            <Card className="lg:col-span-2">
              <h3 className="mb-2 font-semibold">Headline distribution</h3>
              <SentimentBars distribution={result.distribution} />
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-brand" />
              <h3 className="font-semibold">Sentiment summary</h3>
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{result.commentary}</p>
          </Card>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Latest headlines</h2>
            <div className="space-y-2">
              {result.items.map((n, i) => (
                <a
                  key={i}
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-raised/60 p-4 transition-colors hover:border-brand/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="line-clamp-2">{n.title}</span>
                      <ExternalLink size={13} className="shrink-0 text-ink-faint transition-colors group-hover:text-brand" />
                    </div>
                    <div className="mt-1 text-xs text-ink-faint">
                      {n.source} · {n.published_at ? timeAgo(n.published_at) : ""}
                    </div>
                  </div>
                  <StatusBadge status={n.sentiment} />
                </a>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
