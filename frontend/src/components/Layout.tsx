import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  Calculator,
  Scale,
  Users,
  Newspaper,
  Briefcase,
  LogOut,
  Menu,
  X,
  LineChart,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/documents", label: "Filings", icon: FileText },
  { to: "/chat", label: "Chat", icon: MessagesSquare },
  { to: "/valuation", label: "DCF Valuation", icon: Calculator },
  { to: "/ratios", label: "Ratio Analysis", icon: Scale },
  { to: "/competitors", label: "Competitors", icon: Users },
  { to: "/sentiment", label: "News Sentiment", icon: Newspaper },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== "/"));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-line bg-surface-raised/80 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
            <LineChart size={20} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">FinResearch</div>
            <div className="text-[11px] text-ink-faint">AI Research Agent</div>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer",
                  isActive
                    ? "bg-brand/15 text-brand"
                    : "text-ink-muted hover:bg-surface-overlay/60 hover:text-ink"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 text-accent text-sm font-semibold">
              {(user?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.full_name || "Analyst"}</div>
              <div className="truncate text-[11px] text-ink-faint">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="cursor-pointer rounded-lg p-2 text-ink-faint transition-colors hover:bg-bear/15 hover:text-bear"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-base/70 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="cursor-pointer rounded-lg p-2 text-ink-muted hover:bg-surface-overlay/60 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg font-semibold">{active?.label ?? "Dashboard"}</h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-line bg-surface/50 px-3 py-1.5 text-xs text-ink-muted sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-bull" />
            Live workspace
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8">
          <div className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
