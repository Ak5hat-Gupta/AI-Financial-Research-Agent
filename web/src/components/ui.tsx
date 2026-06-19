"use client";
import { cn } from "@/lib/utils";
import type { ReactNode, HTMLAttributes } from "react";

export function Card({ className, children, ...p }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass p-5", className)} {...p}>{children}</div>;
}

export function Stat({ label, value, sub, tone = "default" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "bull" | "bear" | "warn" }) {
  const t = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold nums", t)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

const STATUS: Record<string, string> = {
  good: "bg-bull-soft text-bull", positive: "bg-bull-soft text-bull", ready: "bg-bull-soft text-bull",
  fair: "bg-warn-soft text-warn", processing: "bg-warn-soft text-warn",
  weak: "bg-bear-soft text-bear", negative: "bg-bear-soft text-bear", failed: "bg-bear-soft text-bear",
  neutral: "bg-ink-faint/15 text-ink-muted", "n/a": "bg-ink-faint/15 text-ink-faint",
};
export function Badge({ status }: { status: string }) {
  return <span className={cn("chip capitalize", STATUS[status] ?? "bg-info-soft text-info")}>{status}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-overlay/60", className)} />;
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mb-4 rounded-xl border border-bear/40 bg-bear-soft px-4 py-3 text-sm text-bear">{message}</div>;
}

export function Empty({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/30 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <h3 className="text-sm font-semibold">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-sm text-ink-muted">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
