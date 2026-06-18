import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = "#64748B";
const GRID = "#1F2A3C";
export const PIE_COLORS = ["#10B981", "#38BDF8", "#F59E0B", "#A78BFA", "#F43F5E", "#22D3EE", "#FB923C"];

const tooltipStyle = {
  background: "#0F172A",
  border: "1px solid #1F2A3C",
  borderRadius: 12,
  color: "#F8FAFC",
  fontSize: 12,
};

export function FcfAreaChart({ data }: { data: { year: string; fcf: number; pv: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gFcf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" stroke={AXIS} fontSize={12} tickLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toLocaleString()}M`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="fcf" name="Projected FCF" stroke="#10B981" fill="url(#gFcf)" strokeWidth={2} />
        <Area type="monotone" dataKey="pv" name="Present Value" stroke="#38BDF8" fill="url(#gPv)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PeerBarChart({
  data,
  dataKey,
  label,
  color = "#10B981",
}: {
  data: { ticker: string; value: number | null }[];
  dataKey?: string;
  label: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="ticker" stroke={AXIS} fontSize={12} tickLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
        <Bar dataKey={dataKey ?? "value"} name={label} radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AllocationPie({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={64}
          outerRadius={104}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SentimentBars({ distribution }: { distribution: Record<string, number> }) {
  const data = [
    { name: "Positive", value: distribution.positive || 0, fill: "#22C55E" },
    { name: "Neutral", value: distribution.neutral || 0, fill: "#64748B" },
    { name: "Negative", value: distribution.negative || 0, fill: "#F43F5E" },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" stroke={AXIS} fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={12} width={70} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
