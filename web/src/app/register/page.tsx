"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, ArrowRight, LineChart } from "lucide-react";
import { useAuth } from "@/store/auth";
import { apiErr } from "@/lib/api";
import { ErrorNote, Spinner } from "@/components/ui";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setLoading(true);
    try { await register(email, password, fullName); router.push("/dashboard"); }
    catch (x) { setErr(apiErr(x, "Could not create account")); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand"><LineChart size={24} /></span>
          <div><div className="text-lg font-semibold">Atlas</div><div className="text-xs text-ink-faint">Create your account</div></div>
        </div>
        <ErrorNote message={err} />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="n" className="lbl">Full name</label>
            <div className="relative"><UserIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input id="n" className="field pl-9" value={fullName} onChange={(x) => setFullName(x.target.value)} placeholder="Jane Analyst" /></div>
          </div>
          <div>
            <label htmlFor="e" className="lbl">Email</label>
            <div className="relative"><Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input id="e" type="email" required className="field pl-9" value={email} onChange={(x) => setEmail(x.target.value)} placeholder="you@firm.com" /></div>
          </div>
          <div>
            <label htmlFor="p" className="lbl">Password</label>
            <div className="relative"><Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input id="p" type="password" required className="field pl-9" value={password} onChange={(x) => setPassword(x.target.value)} placeholder="At least 8 characters" /></div>
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? <Spinner className="h-4 w-4" /> : <>Create account <ArrowRight size={16} /></>}</button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-muted">Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
