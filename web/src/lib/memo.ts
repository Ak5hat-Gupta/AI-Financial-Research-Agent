export interface MemoSection { title: string; body: string; }
export interface MemoResponse {
  id: number;
  ticker: string;
  company: string;
  rating: "Buy" | "Hold" | "Sell";
  conviction: string;
  target_price: number | null;
  current_price: number | null;
  upside_pct: number | null;
  health_score: number;
  sentiment: string;
  sections: MemoSection[];
  created_at: string;
}
