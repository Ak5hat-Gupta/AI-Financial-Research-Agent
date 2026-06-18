import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Briefcase,
  Calculator,
  FileText,
  MessagesSquare,
  Newspaper,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, SkeletonBlock, Stat } from "@/components/ui/primitives";
import { fmtCompact, fmtCurrency, fmtPct, pnlColor } from "@/lib/format";
import type { DocumentItem, PortfolioResult } from "@/lib/types";

interface Snapshot {
  ticker: string;
  company: string;
  price: number;
  eps: number;
  market_cap: number;
}

const QUICK_LINKS = [
  { to: "/documents", label: "Upload a 10-K", desc: "Parse & index filings", icon: FileText },
  { to: "/chat", label: "Chat with filings", desc: "Ask, get cited answers", icon: MessagesSquare },
  { to: "/valuation", label: "Run a DCF", desc: "Intrinsic value model", icon: Calculator },
  { to: "/ratios", label: "Ratio analysis", desc: "Health scorecard", icon: Scale },
  { to: "/competitors", label: "Compare peers", desc: "Benchmark vs rivals", icon: Users },
  { to: "/sentiment", label: "News sentiment", desc: "Read the tape", icon: Newspaper },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioResult | null>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [analyses, setAnalyses] = useState<{ id: number; kind: string; ticker: string; title: string; created_at: string }[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, d, a, t] = await Promise.all([
          api.get<PortfolioResult>("/api/portfolio/recommendations?live=false"),
          api.get<DocumentItem[]>("/api/documents"),
          api.get("/api/analyses"),
          api.get<{ tickers: string[] }>("/api/market/tickers"),
        ]);
        setPortfolio(p.data);
        setDocs(d.data);
        setAnalyses(a.data.slice(0, 5));
        const top = t.data.tickers.slice(0, 4);
        const snaps = await Promise.all(
          top.map((tk) => api.get<Snapshot>(`/api/market/${tk}?live=false`).then((r) => r.data))
        );
        setSnapshots(snaps);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {user?.full_name?.split(" ")[0] || "Analyst"}.
        </h1>
        <p className="text-sm text-ink-muted">Here's your research desk at a glance.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)
        ) : (
          <>
            <Stat label="Portfolio value" value={fmtCurrency(portfolio?.total_value, 0)} sub="Live mark" />
            <Stat
              label="Total return"
              value={fmtPct(portfolio?.total_gain_pct)}
              tone={(portfolio?.total_gain_pct ?? 0) >= 0 ? "bull" : "bear"}
              sub="vs cost basis"
            />
            <Stat label="Filings indexed" value={docs.length} sub="Ready to query" />
            <Stat label="Analyses run" value={analyses.length >= 5 ? "5+" : analyses.length} sub="DCF · ratios · peers" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Watchlist */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Market watch</h2>
            <span className="text-xs text-ink-faint">Sample data · connect yfinance for live</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)
              : snapshots.map((s) => (
                  <Link
                    key={s.ticker}
                    to={`/valuation?ticker=${s.ticker}`}
                    className="group flex items-center justify-between rounded-xl border border-line bg-surface/40 p-4 transition-colors hover:border-brand/40 hover:bg-surface-overlay/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold nums">{s.ticker}</span>
                        <ArrowUpRight size={14} className="text-ink-faint transition-colors group-hover:text-brand" />
                      </div>
                      <div className="truncate text-xs text-ink-muted">{s.company}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold nums">{fmtCurrency(s.price)}</div>
                      <div className="text-xs text-ink-faint nums">{fmtCompact(s.market_cap * 1_000_000)} cap</div>
                    </div>
                  </Link>
                ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card>
          <h2 className="mb-4 text-base font-semibold">Recent analyses</h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-10" />)}
            </div>
          ) : analyses.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No analyses yet. Run a <Link to="/valuation" className="text-brand hover:underline">DCF</Link> to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {analyses.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface/30 px-3 py-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/10 text-brand">
                    <TrendingUp size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{a.title}</div>
                    <div className="text-[11px] uppercase tracking-wide text-ink-faint">{a.kind}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Jump back in</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface-raised/60 p-4 transition-colors hover:border-brand/40 hover:bg-surface-overlay/50"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand/20">
                <Icon size={18} />
              </span>
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-ink-muted">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {portfolio && portfolio.holdings.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Briefcase size={16} className="text-brand" />
            <h2 className="text-base font-semibold">Top holdings</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.holdings.slice(0, 6).map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-line bg-surface/30 px-3 py-2">
                <span className="font-semibold nums">{h.ticker}</span>
                <span className={`text-sm nums ${pnlColor(h.gain_pct)}`}>{fmtPct(h.gain_pct)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
