"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Search, TrendingUp, ArrowRight, LayoutDashboard, FileText, MessagesSquare, Briefcase, Users, ScrollText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: TrendingUp },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "AI Research", href: "/research", icon: MessagesSquare },
  { label: "Competitors", href: "/competitors", icon: Users },
  { label: "Memos", href: "/memos", icon: ScrollText },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open && tickers.length === 0) api.get("/market/tickers").then((r) => setTickers(r.data.tickers)).catch(() => {});
  }, [open, tickers.length]);

  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };

  const tickerMatches = useMemo(() => {
    const s = q.trim().toUpperCase();
    const base = s ? tickers.filter((t) => t.includes(s)) : tickers;
    if (s && !base.includes(s)) base.unshift(s);
    return base.slice(0, 6);
  }, [q, tickers]);

  const navMatches = NAV.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost h-9 gap-2 px-3 text-xs">
        <Search size={14} /> Search<kbd className="ml-1 rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] text-ink-faint">⌘K</kbd>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div className="glass w-full max-w-xl overflow-hidden p-0" initial={{ scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search size={16} className="text-ink-faint" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies, pages…"
                  className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-ink-faint" />
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {tickerMatches.length > 0 && <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-ink-faint">Companies</div>}
                {tickerMatches.map((t) => (
                  <button key={t} onClick={() => go(`/companies/${t}`)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-overlay/60">
                    <span className="flex items-center gap-2.5"><TrendingUp size={15} className="text-brand" /><span className="nums font-medium">{t}</span></span>
                    <ArrowRight size={14} className="text-ink-faint" />
                  </button>
                ))}
                <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-ink-faint">Navigate</div>
                {navMatches.map((n) => (
                  <button key={n.href} onClick={() => go(n.href)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-overlay/60">
                    <n.icon size={15} className="text-ink-muted" />{n.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
