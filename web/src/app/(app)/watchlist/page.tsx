"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2, RefreshCw, Eye, Bell } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Empty, ErrorNote, Spinner, Skeleton } from "@/components/ui";
import { money, compact, ago } from "@/lib/format";
import type { WatchItem, Notif } from "@/lib/insights";

export default function Watchlist() {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["watchlist"], queryFn: async () => (await api.get<WatchItem[]>("/watchlist")).data });
  const notifs = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get<Notif[]>("/notifications")).data });
  const [ticker, setTicker] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!ticker.trim()) return;
    setErr("");
    try { await api.post("/watchlist", { ticker: ticker.toUpperCase() }); setTicker(""); qc.invalidateQueries({ queryKey: ["watchlist"] }); }
    catch (x) { setErr(apiErr(x, "Could not add")); }
  }
  async function remove(id: number) { await api.delete(`/watchlist/${id}`); qc.invalidateQueries({ queryKey: ["watchlist"] }); }
  async function refresh() { setBusy(true); try { await api.post("/watchlist/refresh"); qc.invalidateQueries({ queryKey: ["notifications"] }); } finally { setBusy(false); } }

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <div className="flex gap-2">
              <input className="field nums uppercase" placeholder="Add ticker, e.g. NVDA" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
              <button onClick={add} className="btn-primary px-4"><Plus size={16} /></button>
            </div>
          </Card>
          {items.isLoading ? <Skeleton className="h-40" /> : !items.data?.length ?
            <Empty icon={<Eye size={28} />} title="Watchlist empty" desc="Add tickers to track price, sector and daily updates." /> :
            <div className="space-y-2">{items.data.map((w) => (
              <Card key={w.id} className="flex items-center justify-between py-3">
                <Link href={`/companies/${w.ticker}`} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-info/10 text-xs font-semibold text-info nums">{w.ticker.slice(0, 2)}</span><div><div className="nums font-semibold">{w.ticker}</div><div className="text-xs text-ink-faint">{w.company} · {w.sector}</div></div></Link>
                <div className="flex items-center gap-4"><div className="text-right"><div className="nums text-sm font-semibold">{money(w.price)}</div><div className="nums text-xs text-ink-faint">{compact(w.market_cap * 1e6)}</div></div><button onClick={() => remove(w.id)} aria-label="Remove" className="cursor-pointer rounded-lg p-1.5 text-ink-faint hover:bg-bear-soft hover:text-bear"><Trash2 size={14} /></button></div>
              </Card>
            ))}</div>}
        </div>

        <Card className="h-fit">
          <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-1.5 font-semibold"><Bell size={15} /> Daily updates</h3><button onClick={refresh} className="btn-ghost px-2.5 py-1.5 text-xs" disabled={busy}>{busy ? <Spinner className="h-3.5 w-3.5" /> : <><RefreshCw size={13} /> Refresh</>}</button></div>
          {notifs.isLoading ? <Skeleton className="h-32" /> : !notifs.data?.length ?
            <p className="text-sm text-ink-muted">No updates yet. Add tickers and hit Refresh.</p> :
            <div className="space-y-2">{notifs.data.map((n) => (
              <div key={n.id} className="rounded-lg border border-line bg-surface/40 p-3"><div className="flex items-center justify-between"><span className="chip bg-info-soft text-info capitalize">{n.kind}</span><span className="text-[11px] text-ink-faint">{ago(n.created_at)}</span></div><div className="mt-1.5 text-sm font-medium">{n.title}</div><div className="text-xs text-ink-muted">{n.body}</div></div>
            ))}</div>}
        </Card>
      </div>
    </div>
  );
}
