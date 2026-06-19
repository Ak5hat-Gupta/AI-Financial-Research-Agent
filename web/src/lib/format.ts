export const money = (v?: number | null, d = 2) =>
  v == null || Number.isNaN(v)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

export const compact = (v?: number | null) =>
  v == null || Number.isNaN(v) ? "—" : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);

// value supplied in millions
export const millions = (v?: number | null) => (v == null ? "—" : "$" + compact(v * 1_000_000).replace("$", ""));

export const pct = (v?: number | null, d = 1) => (v == null || Number.isNaN(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`);

export const num = (v?: number | null, d = 2) =>
  v == null || Number.isNaN(v) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const pnl = (v?: number | null) => (v == null ? "text-ink-muted" : v > 0 ? "text-bull" : v < 0 ? "text-bear" : "text-ink-muted");

export const ago = (iso?: string) => {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
