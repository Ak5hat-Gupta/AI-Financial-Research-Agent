"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { ago } from "@/lib/format";
import type { Notif } from "@/lib/insights";

export function NotificationsBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get<Notif[]>("/notifications")).data, refetchInterval: 60_000 });
  const unread = (q.data ?? []).filter((n) => !n.read).length;

  async function openPanel() {
    setOpen((v) => !v);
    if (!open && unread > 0) { await api.post("/notifications/read"); qc.invalidateQueries({ queryKey: ["notifications"] }); }
  }

  return (
    <div className="relative">
      <button onClick={openPanel} aria-label="Notifications" className="relative cursor-pointer rounded-lg border border-line bg-surface/40 p-2 text-ink-muted hover:text-ink">
        <Bell size={16} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bear px-1 text-[10px] font-semibold text-white">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="glass absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto p-2">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Notifications</div>
              {(q.data ?? []).length === 0 ? <p className="px-2 py-4 text-sm text-ink-muted">Nothing yet. Add tickers to your watchlist.</p> :
                (q.data ?? []).map((n) => (
                  <div key={n.id} className="rounded-lg px-2 py-2 hover:bg-surface-overlay/50"><div className="flex items-center justify-between"><span className="text-xs font-medium text-info capitalize">{n.kind}{n.ticker ? ` · ${n.ticker}` : ""}</span><span className="text-[11px] text-ink-faint">{ago(n.created_at)}</span></div><div className="text-sm">{n.title}</div></div>
                ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
