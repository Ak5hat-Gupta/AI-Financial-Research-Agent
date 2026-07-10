"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const AXIS = "#9A9BA4", GRID = "#E6E4DD";
export const PIE = ["#4F46E5", "#7C3AED", "#059669", "#D97706", "#E11D48", "#0891B2", "#DB2777"];
const tip = { background: "#FFFFFF", border: "1px solid #E6E4DD", borderRadius: 12, color: "#16161D", fontSize: 12, boxShadow: "0 12px 32px -14px rgba(22,22,29,0.20)" };

export function FcfArea({ data }: { data: { year: string; fcf: number; pv: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.45} /><stop offset="100%" stopColor="#059669" stopOpacity={0} /></linearGradient>
          <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} /><stop offset="100%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" stroke={AXIS} fontSize={12} tickLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={46} />
        <Tooltip contentStyle={tip} formatter={(v: number) => `$${v.toLocaleString()}M`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="fcf" name="Projected FCF" stroke="#059669" fill="url(#gf)" strokeWidth={2} />
        <Area type="monotone" dataKey="pv" name="Present Value" stroke="#4F46E5" fill="url(#gp)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, color = "#4F46E5", label }: { data: { ticker: string; value: number | null }[]; color?: string; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="ticker" stroke={AXIS} fontSize={12} tickLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} />
        <Tooltip contentStyle={tip} cursor={{ fill: "rgba(155,163,175,0.06)" }} />
        <Bar dataKey="value" name={label} radius={[6, 6, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={color} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={64} outerRadius={104} paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tip} formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SentimentBars({ distribution }: { distribution: Record<string, number> }) {
  const data = [
    { name: "Positive", value: distribution.positive || 0, fill: "#059669" },
    { name: "Neutral", value: distribution.neutral || 0, fill: "#9A9BA4" },
    { name: "Negative", value: distribution.negative || 0, fill: "#E11D48" },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" stroke={AXIS} fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={12} width={70} tickLine={false} />
        <Tooltip contentStyle={tip} cursor={{ fill: "rgba(155,163,175,0.06)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>{data.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
