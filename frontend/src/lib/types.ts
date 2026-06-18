export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: number;
  filename: string;
  ticker: string;
  company: string;
  doc_type: string;
  page_count: number;
  char_count: number;
  status: string;
  summary: string;
  created_at: string;
}

export interface Citation {
  document_id: number;
  page: number;
  snippet: string;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  created_at?: string;
}

export interface DCFYear {
  year: number;
  fcf: number;
  discount_factor: number;
  present_value: number;
}

export interface DCFResult {
  ticker: string;
  company: string;
  assumptions: Record<string, number | null>;
  projections: DCFYear[];
  pv_of_fcf: number;
  terminal_value: number;
  pv_terminal_value: number;
  enterprise_value: number;
  equity_value: number;
  fair_value_per_share: number | null;
  current_price: number | null;
  upside_pct: number | null;
  verdict: string;
  commentary: string;
}

export interface RatioMetric {
  label: string;
  value: number | null;
  unit: string;
  benchmark: string;
  status: "good" | "fair" | "weak" | "n/a";
}

export interface RatioGroup {
  name: string;
  metrics: RatioMetric[];
}

export interface RatioResult {
  ticker: string;
  company: string;
  groups: RatioGroup[];
  health_score: number;
  commentary: string;
}

export interface CompetitorRow {
  ticker: string;
  company: string;
  price: number | null;
  market_cap: number | null;
  pe: number | null;
  gross_margin: number | null;
  net_margin: number | null;
  roe: number | null;
  debt_to_equity: number | null;
  revenue: number | null;
}

export interface CompetitorResult {
  ticker: string;
  peers: CompetitorRow[];
  metrics: string[];
  commentary: string;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
}

export interface SentimentResult {
  ticker: string;
  overall: "positive" | "neutral" | "negative";
  score: number;
  distribution: Record<string, number>;
  items: NewsItem[];
  commentary: string;
}

export interface Holding {
  id: number;
  ticker: string;
  shares: number;
  cost_basis: number;
  current_price?: number | null;
  market_value?: number | null;
  gain_pct?: number | null;
}

export interface Recommendation {
  type: "info" | "warning" | "danger" | "success";
  title: string;
  detail: string;
}

export interface PortfolioResult {
  holdings: Holding[];
  total_value: number;
  total_cost: number;
  total_gain_pct: number;
  allocation: { label: string; value: number; weight: number }[];
  recommendations: Recommendation[];
  commentary: string;
}
