"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Stat, Spinner } from "@/components/ui";
import { money, pct } from "@/lib/format";
import type { MemoResponse } from "@/lib/memo";

export default function Memo() {
  const id = String(useParams().id);
  const [dl, setDl] = useState(false);
  const memo = useQuery({ queryKey: ["memo", id], queryFn: async () => (await api.get<MemoResponse>(`/memo/${id}`)).data });

  async function download() {
    setDl(true);
    try {
      const r = await api.get(`/memo/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${memo.data?.ticker}_memo.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setDl(false); }
  }

  if (memo.isLoading) return <Card><div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div></Card>;
  const m = memo.data!;
  const ratingTone = m.rating === "Buy" ? "text-bull" : m.rating === "Sell" ? "text-bear" : "text-warn";
  const bull = (m.upside_pct ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/memos" className="btn-ghost px-3 py-2 text-xs"><ArrowLeft size={14} /> All memos</Link>
        <button onClick={download} className="btn-primary px-4 py-2 text-sm" disabled={dl}>{dl ? <Spinner className="h-4 w-4" /> : <><Download size={15} /> Download PDF</>}</button>
      </div>

      <Card className={`border-l-4 ${bull ? "border-l-bull" : "border-l-bear"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-xs uppercase tracking-wide text-ink-muted">Investment memo</div><h2 className="nums mt-1 text-2xl font-semibold">{m.ticker} <span className="font-sans text-ink-muted">· {m.company}</span></h2></div>
          <div className="text-right"><div className="text-xs uppercase tracking-wide text-ink-muted">Rating</div><div className={`text-2xl font-bold ${ratingTone}`}>{m.rating}</div><div className="text-xs text-ink-faint">{m.conviction} conviction</div></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Target price" value={money(m.target_price)} tone={bull ? "bull" : "bear"} />
          <Stat label="Current price" value={money(m.current_price)} />
          <Stat label="Upside" value={pct(m.upside_pct)} tone={bull ? "bull" : "bear"} />
          <Stat label="Health score" value={`${m.health_score.toFixed(0)}/100`} tone={m.health_score >= 60 ? "bull" : "warn"} />
        </div>
      </Card>

      <div className="space-y-4">
        {m.sections.map((s, i) => (
          <Card key={i}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand">{s.title}</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{s.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
