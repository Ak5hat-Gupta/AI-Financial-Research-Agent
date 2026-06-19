"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, LineChart, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";
import { useAuth } from "@/store/auth";
import { apiErr } from "@/lib/api";
import { ErrorNote, Spinner } from "@/components/ui";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("demo@fra.ai");
  const [password, setPassword] = useState("demo12345");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    try { await login(email, password); router.push("/dashboard"); }
    catch (x) { setErr(apiErr(x, "Login failed")); } finally { setLoading(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-line bg-surface-raised/40 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-info/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand"><LineChart size={24} /></span>
          <div><div className="text-lg font-semibold">Atlas</div><div className="text-xs text-ink-faint">AI Equity Research Platform</div></div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Institutional-grade research,<span className="text-brand"> on every desk.</span></h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">Interrogate filings, value companies, benchmark peers and analyse portfolios — in one workspace.</p>
          <ul className="mt-8 space-y-4 text-sm text-ink/90">
            <li className="flex items-start gap-3"><span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-brand"><Sparkles size={16} /></span>Cited answers grounded in source filings</li>
            <li className="flex items-start gap-3"><span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-brand"><TrendingUp size={16} /></span>DCF valuation, ratios and peer benchmarking</li>
            <li className="flex items-start gap-3"><span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-brand"><ShieldCheck size={16} /></span>Sentiment and portfolio risk intelligence</li>
          </ul>
        </div>
        <div className="relative text-xs text-ink-faint">FastAPI · Next.js · PostgreSQL · pgvector · Redis</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to your research workspace.</p>
          <div className="mt-8"><ErrorNote message={err} /></div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="e" className="lbl">Email</label>
              <div className="relative"><Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input id="e" type="email" required className="field pl-9" value={email} onChange={(x) => setEmail(x.target.value)} /></div>
            </div>
            <div>
              <label htmlFor="p" className="lbl">Password</label>
              <div className="relative"><Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input id="p" type="password" required className="field pl-9" value={password} onChange={(x) => setPassword(x.target.value)} /></div>
            </div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? <Spinner className="h-4 w-4" /> : <>Sign in <ArrowRight size={16} /></>}</button>
          </form>
          <div className="mt-6 rounded-xl border border-line bg-surface/40 px-4 py-3 text-xs text-ink-muted">Demo — <span className="nums">demo@fra.ai / demo12345</span></div>
          <p className="mt-6 text-center text-sm text-ink-muted">No account? <Link href="/register" className="font-medium text-brand hover:underline">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}
