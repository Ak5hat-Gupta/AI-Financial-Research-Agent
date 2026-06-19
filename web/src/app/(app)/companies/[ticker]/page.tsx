"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Sparkles, FileText, Calculator } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Stat, Badge, Skeleton, Spinner } from "@/components/ui";
import { FcfArea } from "@/components/charts";
import { money, num, pct, compact, millions } from "@/lib/format";
import type { Fundamentals, Ratios, DCF, Competitors, Sentiment } from "@/lib/types";

const TABS = ["Overview", "Financials", "Valuation", "Competitors", "News"] as const;
type Tab = (typeof TABS)[number];

export default function Company() {
  const ticker = String(useParams().ticker || "").toUpperCase();
  const [tab, setTab] = useState<Tab>("Overview");

  const f = useQuery({ queryKey: ["f", ticker], queryFn: async () => (await api.get<Fundamentals>(`/market/${ticker}?live=false`)).data });
  const ratios = useQuery({ queryKey: ["r", ticker], enabled: tab === "Financials" || tab === "Overview", queryFn: async () => (await api.post<Ratios>(`/ratios?live=false`, { ticker })).data });
  const dcf = useQuery({ queryKey: ["d", ticker], enabled: tab === "Valuation", queryFn: async () => (await api.post<DCF>(`/valuation/dcf?live=false`, { ticker })).data });
  const peers = useQuery({ queryKey: ["c", ticker], enabled: tab === "Competitors", queryFn: async () => (await api.post<Competitors>(`/competitors?live=false`, { ticker, peers: [] })).data });
  const news = useQuery({ queryKey: ["n", ticker], enabled: tab === "News", queryFn: async () => (await api.post<Sentiment>(`/sentiment?live=false`, { ticker })).data });

  const d = f.data;
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3"><h2 className="nums text-2xl font-semibold">{ticker}</h2>{d?.sector && <span className="chip bg-info-soft text-info">{d.sector}</span>}</div>
            <p className="text-sm text-ink-muted">{d?.company || (f.isLoading ? "Loading…" : ticker)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right"><div className="nums text-2xl font-semibold">{money(d?.price)}</div><div className="text-xs text-ink-faint">{compact((d?.market_cap ?? 0) * 1e6)} mkt cap</div></div>
            <div className="flex gap-2">
              <Link href={`/research?ticker=${ticker}`} className="btn-ghost px-3 py-2 text-xs"><FileText size={14} /> Research</Link>
              <Link href={`/valuation?ticker=${ticker}`} className="btn-primary px-3 py-2 text-xs"><Calculator size={14} /> Value</Link>
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-1 overflow-x-auto border-t border-line pt-3">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${tab === t ? "bg-brand/15 text-brand" : "text-ink-muted hover:text-ink"}`}>{t}</button>
          ))}
        </div>
      </Card>

      {tab === "Overview" && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Revenue" value={millions(d?.revenue)} />
            <Stat label="Net income" value={millions(d?.net_income)} />
            <Stat label="Free cash flow" value={millions(d?.fcf)} />
            <Stat label="Health score" value={ratios.data ? `${num(ratios.data.health_score, 0)}/100` : "…"} tone={(ratios.data?.health_score ?? 0) >= 60 ? "bull" : "warn"} />
          </div>
          <Card><div className="mb-2 flex items-center gap-2"><Sparkles size={16} className="text-brand" /><h3 className="font-semibold">AI summary</h3></div><p className="text-sm leading-relaxed text-ink-muted">{ratios.data?.commentary ?? "Generating…"}</p></Card>
        </>
      )}

      {tab === "Financials" && (ratios.isLoading ? <Loader /> : ratios.data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ratios.data.groups.map((g) => (
            <Card key={g.name}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{g.name}</h3>
              <ul className="space-y-3">{g.metrics.map((m) => (
                <li key={m.label} className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><Badge status={m.status} />{m.label}</span><span className="nums text-sm font-semibold">{m.value == null ? "—" : `${num(m.value, m.unit === "%" ? 1 : 2)}${m.unit === "%" ? "%" : m.unit === "x" ? "×" : ""}`}</span></li>
              ))}</ul>
            </Card>
          ))}
        </div>
      ))}

      {tab === "Valuation" && (dcf.isLoading ? <Loader /> : dcf.data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Fair value / share" value={money(dcf.data.fair_value_per_share)} tone={(dcf.data.upside_pct ?? 0) >= 0 ? "bull" : "bear"} />
            <Stat label="Current price" value={money(dcf.data.current_price)} />
            <Stat label="Upside" value={pct(dcf.data.upside_pct)} tone={(dcf.data.upside_pct ?? 0) >= 0 ? "bull" : "bear"} />
            <Stat label="Verdict" value={<span className="text-base">{dcf.data.verdict}</span>} />
          </div>
          <Card><h3 className="mb-4 font-semibold">Projected free cash flow</h3><FcfArea data={dcf.data.projections.map((p) => ({ year: `Y${p.year}`, fcf: Math.round(p.fcf), pv: Math.round(p.present_value) }))} /></Card>
          <Card><p className="text-sm leading-relaxed text-ink-muted">{dcf.data.commentary}</p><Link href={`/valuation?ticker=${ticker}`} className="btn-ghost mt-4 text-xs">Open full model →</Link></Card>
        </>
      ))}

      {tab === "Competitors" && (peers.isLoading ? <Loader /> : peers.data && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted"><th className="p-4">Company</th><th className="p-4 text-right">Price</th><th className="p-4 text-right">Mkt cap</th><th className="p-4 text-right">P/E</th><th className="p-4 text-right">Net %</th><th className="p-4 text-right">ROE %</th></tr></thead>
            <tbody className="nums">{peers.data.peers.map((p, i) => (<tr key={p.ticker} className={`border-b border-line/60 ${i === 0 ? "bg-brand/5" : ""}`}><td className="p-4"><span className="font-semibold">{p.ticker}</span>{i === 0 && <span className="chip ml-2 bg-brand/15 text-brand">target</span>}<div className="font-sans text-xs text-ink-faint">{p.company}</div></td><td className="p-4 text-right">{money(p.price)}</td><td className="p-4 text-right">{millions(p.market_cap)}</td><td className="p-4 text-right">{p.pe ? `${num(p.pe, 1)}×` : "—"}</td><td className="p-4 text-right">{p.net_margin != null ? `${num(p.net_margin, 1)}%` : "—"}</td><td className="p-4 text-right">{p.roe != null ? `${num(p.roe, 1)}%` : "—"}</td></tr>))}</tbody>
          </table>
        </Card>
      ))}

      {tab === "News" && (news.isLoading ? <Loader /> : news.data && (
        <>
          <Card><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wide text-ink-muted">Overall sentiment</div><div className={`mt-1 text-2xl font-semibold capitalize ${news.data.overall === "positive" ? "text-bull" : news.data.overall === "negative" ? "text-bear" : "text-ink"}`}>{news.data.overall}</div></div><div className="nums text-sm text-ink-faint">score {news.data.score.toFixed(2)}</div></div><p className="mt-3 text-sm text-ink-muted">{news.data.commentary}</p></Card>
          <div className="space-y-2">{news.data.items.map((n, i) => (<a key={i} href={n.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-raised/60 p-4 transition-colors hover:border-brand/40"><div><div className="text-sm font-medium">{n.title}</div><div className="mt-1 text-xs text-ink-faint">{n.source}</div></div><Badge status={n.sentiment} /></a>))}</div>
        </>
      ))}
    </div>
  );
}

function Loader() { return <Card><div className="flex h-40 items-center justify-center"><Spinner className="h-7 w-7 text-brand" /></div></Card>; }
