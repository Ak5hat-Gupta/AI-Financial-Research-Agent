"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Skeleton } from "@/components/ui";
import { money, compact } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export default function Companies() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const tickers = useQuery({ queryKey: ["tickers"], queryFn: async () => (await api.get<{ tickers: string[] }>("/market/tickers")).data.tickers });
  const snaps = useQuery({
    queryKey: ["snaps", tickers.data],
    enabled: !!tickers.data,
    queryFn: async () => Promise.all(tickers.data!.map((t) => api.get<Fundamentals>(`/market/${t}?live=false`).then((r) => r.data))),
  });

  const open = (t: string) => router.push(`/companies/${t.toUpperCase()}`);
  const list = (snaps.data ?? []).filter((s) => !q || s.ticker.includes(q.toUpperCase()) || s.company.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="field pl-10" placeholder="Search ticker or company, then press Enter…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) open(q.trim()); }} />
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {snaps.isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />) : list.map((s) => (
          <button key={s.ticker} onClick={() => open(s.ticker)} className="group glass p-5 text-left transition-colors hover:border-brand/40">
            <div className="flex items-start justify-between">
              <div><div className="flex items-center gap-2"><span className="nums text-lg font-semibold">{s.ticker}</span><ArrowUpRight size={15} className="text-ink-faint group-hover:text-brand" /></div><div className="truncate text-sm text-ink-muted">{s.company}</div></div>
              <span className="chip bg-info-soft text-info">{s.sector || "—"}</span>
            </div>
            <div className="mt-4 flex items-end justify-between"><div><div className="nums text-2xl font-semibold">{money(s.price)}</div><div className="text-xs text-ink-faint">price</div></div><div className="text-right"><div className="nums font-medium">{compact(s.market_cap * 1e6)}</div><div className="text-xs text-ink-faint">market cap</div></div></div>
          </button>
        ))}
      </div>
    </div>
  );
}
