import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "@/components/AuthShell";
import { ErrorBanner, Spinner } from "@/components/ui/primitives";
import { apiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@fra.ai");
  const [password, setPassword] = useState("demo12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to your research workspace.</p>
      </div>

      <ErrorBanner message={error} />

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              id="email"
              type="email"
              required
              className="input pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              id="password"
              type="password"
              required
              className="input pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : <>Sign in <ArrowRight size={16} /></>}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-line bg-surface/40 px-4 py-3 text-xs text-ink-muted">
        <span className="font-medium text-ink">Demo account</span> — pre-filled above
        (<span className="nums">demo@fra.ai / demo12345</span>). Run{" "}
        <code className="rounded bg-surface-overlay px-1 py-0.5 text-ink">make seed</code> to create it.
      </div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        No account?{" "}
        <Link to="/signup" className="font-medium text-brand hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
