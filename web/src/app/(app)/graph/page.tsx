"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Network } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/components/ui";
import type { GraphData } from "@/lib/insights";

const W = 820, H = 560, CX = W / 2, CY = H / 2;

export default function Graph() {
  const router = useRouter();
  const [ticker, setTicker] = useState("AAPL");
  const [depth, setDepth] = useState(1);
  const g = useQuery({ queryKey: ["graph", ticker, depth], queryFn: async () => (await api.get<GraphData>(`/graph?ticker=${ticker}&depth=${depth}`)).data });

  const pos = (() => {
    const d = g.data; if (!d) return {} as Record<string, { x: number; y: number }>;
    const comps = d.nodes.filter((n) => n.kind === "company" && n.id !== d.root);
    const secs = d.nodes.filter((n) => n.kind === "sector");
    const m: Record<string, { x: number; y: number }> = { [d.root]: { x: CX, y: CY } };
    comps.forEach((n, i) => { const a = (i / Math.max(comps.length, 1)) * Math.PI * 2; m[n.id] = { x: CX + Math.cos(a) * 175, y: CY + Math.sin(a) * 175 }; });
    secs.forEach((n, i) => { const a = (i / Math.max(secs.length, 1)) * Math.PI * 2 - 0.4; m[n.id] = { x: CX + Math.cos(a) * 250, y: CY + Math.sin(a) * 250 }; });
    return m;
  })();

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1"><label className="lbl">Company</label><input className="field nums uppercase" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} /></div>
          <div><label className="lbl">Depth</label><select className="field" value={depth} onChange={(e) => setDepth(Number(e.target.value))}><option value={1}>1 hop</option><option value={2}>2 hops</option><option value={3}>3 hops</option></select></div>
          <div className="flex items-center gap-2 text-xs text-ink-faint"><Network size={14} /> Click a company to open it</div>
        </div>
      </Card>
      <Card className="p-0">
        {g.isLoading ? <div className="flex h-[560px] items-center justify-center"><Spinner className="h-8 w-8 text-brand" /></div> : g.data && (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[560px] w-full">
            {g.data.edges.map((e, i) => { const a = pos[e.source], b = pos[e.target]; if (!a || !b) return null;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.rel === "COMPETES_WITH" ? "#23272F" : "#1a2230"} strokeWidth={1.2} strokeDasharray={e.rel === "IN_SECTOR" ? "4 4" : undefined} />; })}
            {g.data.nodes.map((n) => { const p = pos[n.id]; if (!p) return null; const root = n.id === g.data!.root; const company = n.kind === "company";
              return (
                <g key={n.id} onClick={() => company && router.push(`/companies/${n.label}`)} style={{ cursor: company ? "pointer" : "default" }} className="group">
                  <circle cx={p.x} cy={p.y} r={root ? 30 : company ? 22 : 16} fill={root ? "#10B981" : company ? "#16191F" : "transparent"} stroke={root ? "#10B981" : company ? "#3B82F6" : "#23272F"} strokeWidth={company ? 1.6 : 1} className={company ? "transition-all group-hover:stroke-brand" : ""} />
                  <text x={p.x} y={company ? p.y + 4 : p.y + 3} textAnchor="middle" fontSize={company ? 11 : 9} fontFamily="JetBrains Mono, monospace" fill={root ? "#0A0B0D" : company ? "#F2F4F7" : "#6B7280"} fontWeight={company ? 600 : 400}>{n.label}</text>
                </g>
              ); })}
          </svg>
        )}
      </Card>
      <p className="text-xs text-ink-faint">Solid edges = competes-with · dashed = sector membership. Graph derived from the fundamentals dataset (Neo4j-ready shape).</p>
    </div>
  );
}
