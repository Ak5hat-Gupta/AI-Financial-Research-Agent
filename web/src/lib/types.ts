export interface User { id: number; email: string; full_name: string; }
export interface Fundamentals {
  ticker: string; company: string; sector: string; source: string;
  price: number; eps: number; beta: number; market_cap: number; shares_outstanding: number;
  revenue: number; gross_profit: number; operating_income: number; net_income: number;
  total_assets: number; total_equity: number; total_debt: number; fcf: number; net_debt: number;
  peers: string[];
}
export interface DocumentItem {
  id: number; filename: string; ticker: string; company: string; doc_type: string;
  page_count: number; char_count: number; status: string; summary: string; created_at: string;
}
export interface Citation { document_id: number; page: number; snippet: string; }
export interface ChatMsg { role: "user" | "assistant"; content: string; citations?: Citation[]; }
export interface DCFYear { year: number; fcf: number; discount_factor: number; present_value: number; }
export interface DCF {
  ticker: string; company: string; assumptions: Record<string, number | null>; projections: DCFYear[];
  pv_of_fcf: number; terminal_value: number; pv_terminal_value: number; enterprise_value: number;
  equity_value: number; fair_value_per_share: number | null; current_price: number | null;
  upside_pct: number | null; verdict: string; commentary: string;
}
export interface RatioMetric { label: string; value: number | null; unit: string; benchmark: string; status: string; }
export interface RatioGroup { name: string; metrics: RatioMetric[]; }
export interface Ratios { ticker: string; company: string; groups: RatioGroup[]; health_score: number; commentary: string; }
export interface PeerRow {
  ticker: string; company: string; price: number | null; market_cap: number | null; pe: number | null;
  gross_margin: number | null; net_margin: number | null; roe: number | null; debt_to_equity: number | null; revenue: number | null;
}
export interface Competitors { ticker: string; peers: PeerRow[]; metrics: string[]; commentary: string; }
export interface NewsItem { title: string; source: string; url: string; published_at: string; sentiment: string; score: number; }
export interface Sentiment { ticker: string; overall: string; score: number; distribution: Record<string, number>; items: NewsItem[]; commentary: string; }
export interface Holding { id: number; ticker: string; shares: number; cost_basis: number; current_price?: number | null; market_value?: number | null; gain_pct?: number | null; }
export interface Rec { type: "info" | "warning" | "danger" | "success"; title: string; detail: string; }
export interface Portfolio {
  holdings: Holding[]; total_value: number; total_cost: number; total_gain_pct: number;
  allocation: { label: string; value: number; weight: number }[]; recommendations: Rec[]; commentary: string;
}
