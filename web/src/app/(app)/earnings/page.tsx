"use client";
import { useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { api, apiErr } from "@/lib/api";
import { Card, Stat, Spinner, ErrorNote } from "@/components/ui";
import type { Earnings } from "@/lib/insights";

const SAMPLE = `Thank you all for joining. We are pleased to report record revenue this quarter, up strongly year over year, driven by robust demand across our core platform. Gross margin expanded as operating leverage improved. Management remains confident in our full-year guidance, though we are mindful of some cost pressure and a more competitive pricing environment. We announced a new product launch and increased our dividend, reflecting strong free cash flow. On the outlook, we expect continued momentum into next quarter.`;

export default function EarningsPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [text, setText] = useState(SAMPLE);
  const [res, setRes] = useState<Earnings | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    if (text.trim().length < 40) { setErr("Paste a longer transcript excerpt."); return; }
    setBusy(true); setErr("");
    try { setRes((await api.post<Earnings>("/earnings/analyze", { text, ticker })).data); }
    catch (x) { setErr(apiErr(x, "Analysis failed")); } finally { setBusy(false); }
  }

  const tone = res?.overall === "positive" ? "bull" : res?.overall === "negative" ? "bear" : "warn";

  return (
    <div className="space-y-6">
      <ErrorNote message={err} />
      <Card className="space-y-4">
        <div className="flex items-center gap-2"><Mic size={16} className="text-brand" /><h3 className="font-semibold">Earnings-call analysis</h3></div>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div><label className="lbl">Ticker</label><input className="field nums uppercase" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} /></div>
          <div><label className="lbl">Transcript</label><textarea className="field min-h-[140px] resize-y" value={text} onChange={(e) => setText(e.target.value)} /></div>
        </div>
        <button onClick={run} className="btn-primary" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <><Sparkles size={16} /> Analyze</>}</button>
      </Card>

      {res && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Tone" value={<span className="capitalize">{res.overall}</span>} tone={tone as "bull" | "bear" | "warn"} />
            <Stat label="Mgmt confidence" value={res.confidence_label} sub={`${(res.confidence * 100).toFixed(0)}%`} />
            <Stat label="Positive signals" value={res.positive_signals} tone="bull" />
            <Stat label="Negative signals" value={res.negative_signals} tone="bear" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-semibold">Most-discussed topics</h3>
              <div className="space-y-2">
                {res.topics.map((t) => (
                  <div key={t.topic}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="capitalize">{t.topic}</span><span className="nums text-ink-faint">{t.mentions}</span></div>
                    <div className="h-2 rounded-full bg-surface-overlay"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, (t.mentions / res.topics[0].mentions) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card><div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-brand" /><h3 className="font-semibold">Summary</h3></div><p className="text-sm leading-relaxed text-ink-muted">{res.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{res.keywords.map((k) => <span key={k} className="chip bg-surface-overlay/60 text-ink-muted">{k}</span>)}</div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
