export interface GraphNode { id: string; label: string; kind: "company" | "sector"; company?: string; sector?: string; market_cap?: number; }
export interface GraphEdge { source: string; target: string; rel: string; }
export interface GraphData { root: string; nodes: GraphNode[]; edges: GraphEdge[]; }

export interface Topic { topic: string; mentions: number; weight: number; }
export interface Earnings {
  ticker: string; overall: string; tone: number; confidence: number; confidence_label: string;
  positive_signals: number; negative_signals: number; topics: Topic[]; keywords: string[]; word_count: number; summary: string;
}

export interface WatchItem { id: number; ticker: string; company: string; price: number; sector: string; market_cap: number; }
export interface Notif { id: number; kind: string; ticker: string; title: string; body: string; read: boolean; created_at: string; }
