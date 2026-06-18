import type { ReactNode } from "react";
import { LineChart, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

const FEATURES = [
  { icon: Sparkles, text: "Chat with 10-K filings using grounded, cited answers" },
  { icon: TrendingUp, text: "DCF valuations, ratio analysis & peer comparison" },
  { icon: ShieldCheck, text: "News sentiment and portfolio risk recommendations" },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / marketing panel */}
      <div className="relative hidden overflow-hidden border-r border-line bg-surface-raised/40 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid [background-size:32px_32px] opacity-[0.18]" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand">
            <LineChart size={24} />
          </span>
          <div>
            <div className="text-lg font-semibold">AI Financial Research Agent</div>
            <div className="text-xs text-ink-faint">Your AI-powered Bloomberg Terminal</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Institutional-grade research,
            <span className="text-brand"> for everyone.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Upload filings, interrogate them in plain English, and run valuations,
            ratio analysis and sentiment — all in one terminal.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-ink/90">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
                  <Icon size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-ink-faint">
          Built with FastAPI · React · PostgreSQL · pgvector
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
