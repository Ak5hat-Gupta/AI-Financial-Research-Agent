import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface/60 text-brand">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  good: "bg-bull/15 text-bull",
  fair: "bg-warn/15 text-warn",
  weak: "bg-bear/15 text-bear",
  positive: "bg-bull/15 text-bull",
  negative: "bg-bear/15 text-bear",
  neutral: "bg-ink-faint/15 text-ink-muted",
  "n/a": "bg-ink-faint/15 text-ink-faint",
  ready: "bg-bull/15 text-bull",
  processing: "bg-warn/15 text-warn",
  failed: "bg-bear/15 text-bear",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("chip capitalize", STATUS_STYLES[status] ?? "bg-ink-faint/15 text-ink-muted")}>
      {status}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "bull" | "bear" | "warn";
}) {
  const toneClass =
    tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={clsx("mt-1 text-2xl font-semibold nums", toneClass)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/30 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-bear/40 bg-bear-soft px-4 py-3 text-sm text-bear">
      {message}
    </div>
  );
}
