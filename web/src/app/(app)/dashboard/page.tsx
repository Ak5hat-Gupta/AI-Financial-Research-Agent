"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, FileText, MessagesSquare, Calculator, Users, Briefcase, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Stat, Skeleton } from "@/components/ui";
import { money, pct, compact, pnl } from "@/lib/format";
import type { Portfolio, DocumentItem, Fundamentals } from "@/lib/types";

const LINKS = [
  { href: "/companies", label: "Explore companies", desc: "Search any ticker", icon: TrendingUp },
  { href: "/documents", label: "Upload a filing", desc: "Parse & index 10-Ks", icon: FileText },
  { href: "/research", label: "AI Research", desc: "Cited filing analysis", icon: MessagesSquare },
  { href: "/valuation", label: "Run a DCF", desc: "Intrinsic value", icon: Calculator },
  { href: "/competitors", label: "Benchmark peers", desc: "Compare rivals", icon: Users },
  { href: "/portfolio", label: "Portfolio", desc: "Risk & allocation", icon: Briefcase },
];

export default function Dashboard() {
  const portfolio = useQuery({ queryKey: ["portfolio"], queryFn: async () => (await api.get<Portfolio>("/portfolio/recommendations?live=false")).data });
  const docs = useQuery({ queryKey: ["docs"], queryFn: async () => (await api.get<DocumentItem[]>("/documents")).data });
  const watch = useQuery({
    queryKey: ["watch"],
    queryFn: async () => {
      const t = (await api.get<{ tickers: string[] }>("/market/tickers")).data.tickers.slice(0, 4);
      return Promise.all(t.map((x) => api.get<Fundamentals>(`/market/${x}?live=false`).then((r) => r.data)));
    },
  });

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-semibold">Research desk</h2><p className="text-sm text-ink-muted">Your markets and portfolio at a glance.</p></div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {portfolio.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
          <>
            <Stat label="Portfolio value" value={money(portfolio.data?.total_value, 0)} />
            <Stat label="Total return" value={pct(portfolio.data?.total_gain_pct)} tone={(portfolio.data?.total_gain_pct ?? 0) >= 0 ? "bull" : "bear"} />
            <Stat label="Filings indexed" value={docs.data?.length ?? 0} />
            <Stat label="Positions" value={portfolio.data?.holdings.length ?? 0} />
          </>
        )}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Market watch</h3><span className="text-xs text-ink-faint">Sample data</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {watch.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />) : watch.data?.map((s) => (
            <Link key={s.ticker} href={`/companies/${s.ticker}`} className="group flex items-center justify-between rounded-xl border border-line bg-surface/40 p-4 transition-colors hover:border-brand/40">
              <div><div className="flex items-center gap-2"><span className="nums font-semibold">{s.ticker}</span><ArrowUpRight size={14} className="text-ink-faint group-hover:text-brand" /></div><div className="truncate text-xs text-ink-muted">{s.company}</div></div>
              <div className="text-right"><div className="nums font-semibold">{money(s.price)}</div><div className="nums text-xs text-ink-faint">{compact(s.market_cap * 1e6)} cap</div></div>
            </Link>
          ))}
        </div>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Quick actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="group flex items-center gap-3 rounded-xl border border-line bg-surface-raised/60 p-4 transition-colors hover:border-brand/40">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><l.icon size={18} /></span>
              <div><div className="text-sm font-medium">{l.label}</div><div className="text-xs text-ink-muted">{l.desc}</div></div>
            </Link>
          ))}
        </div>
      </div>

      {portfolio.data && portfolio.data.holdings.length > 0 && (
        <Card>
          <h3 className="mb-4 font-semibold">Holdings</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.data.holdings.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-line bg-surface/30 px-3 py-2"><span className="nums font-semibold">{h.ticker}</span><span className={`nums text-sm ${pnl(h.gain_pct)}`}>{pct(h.gain_pct)}</span></div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
