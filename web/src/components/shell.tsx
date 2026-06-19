"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, TrendingUp, FileText, MessagesSquare, Calculator, Users, Briefcase, LogOut, Menu, X, LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { CommandPalette } from "./command-palette";
import { Spinner } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: TrendingUp },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/research", label: "AI Research", icon: MessagesSquare },
  { href: "/valuation", label: "Valuation", icon: Calculator },
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, hydrate, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!ready) hydrate(); }, [ready, hydrate]);
  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);

  if (!ready || !user)
    return <div className="grid min-h-screen place-items-center"><Spinner className="h-8 w-8 text-brand" /></div>;

  const active = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));

  return (
    <div className="flex min-h-screen">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 transform border-r border-line bg-surface-raised/80 backdrop-blur-xl transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand"><LineChart size={20} /></span>
          <div className="leading-tight"><div className="text-sm font-semibold">Atlas</div><div className="text-[11px] text-ink-faint">Equity Research</div></div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((n) => {
            const on = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", on ? "bg-brand/15 text-brand" : "text-ink-muted hover:bg-surface-overlay/60 hover:text-ink")}>
                <n.icon size={18} />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-info/15 text-sm font-semibold text-info">{(user.full_name || user.email).slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{user.full_name || "Analyst"}</div><div className="truncate text-[11px] text-ink-faint">{user.email}</div></div>
            <button onClick={logout} aria-label="Log out" className="cursor-pointer rounded-lg p-2 text-ink-faint hover:bg-bear-soft hover:text-bear"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-base/70 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button className="cursor-pointer rounded-lg p-2 text-ink-muted hover:bg-surface-overlay/60 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
            <h1 className="text-lg font-semibold">{active?.label ?? "Atlas"}</h1>
          </div>
          <CommandPalette />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8"><div className="animate-in">{children}</div></main>
      </div>
    </div>
  );
}
