from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------- DCF ----------------
class DCFRequest(BaseModel):
    ticker: str = Field(default="", max_length=16)
    company: str = Field(default="")
    # Base year free cash flow (in millions). If omitted, pulled from market data.
    base_fcf: float | None = None
    shares_outstanding: float | None = None  # millions
    net_debt: float | None = None  # millions
    current_price: float | None = None
    growth_rate: float = Field(default=0.10, ge=-0.5, le=1.0)        # near-term FCF growth
    terminal_growth: float = Field(default=0.025, ge=-0.05, le=0.08)  # perpetual growth
    discount_rate: float = Field(default=0.09, ge=0.01, le=0.40)      # WACC
    projection_years: int = Field(default=5, ge=3, le=15)


class DCFYear(BaseModel):
    year: int
    fcf: float
    discount_factor: float
    present_value: float


class DCFResponse(BaseModel):
    ticker: str
    company: str
    assumptions: dict
    projections: list[DCFYear]
    pv_of_fcf: float
    terminal_value: float
    pv_terminal_value: float
    enterprise_value: float
    equity_value: float
    fair_value_per_share: float | None
    current_price: float | None
    upside_pct: float | None
    verdict: str
    commentary: str


# ---------------- Ratios ----------------
class RatioRequest(BaseModel):
    ticker: str = Field(default="", max_length=16)
    # All figures optional; pulled from market data when omitted.
    financials: dict | None = None


class RatioGroup(BaseModel):
    name: str
    metrics: list[dict]  # [{label, value, unit, benchmark, status}]


class RatioResponse(BaseModel):
    ticker: str
    company: str
    groups: list[RatioGroup]
    health_score: float
    commentary: str


# ---------------- Competitors ----------------
class CompetitorRequest(BaseModel):
    ticker: str
    peers: list[str] = []


class CompetitorResponse(BaseModel):
    ticker: str
    peers: list[dict]
    metrics: list[str]
    commentary: str


# ---------------- News sentiment ----------------
class SentimentRequest(BaseModel):
    ticker: str
    query: str | None = None


class NewsItem(BaseModel):
    title: str
    source: str
    url: str
    published_at: str
    sentiment: str   # positive | neutral | negative
    score: float     # -1..1


class SentimentResponse(BaseModel):
    ticker: str
    overall: str
    score: float
    distribution: dict
    items: list[NewsItem]
    commentary: str


# ---------------- Portfolio ----------------
class HoldingIn(BaseModel):
    ticker: str
    shares: float = Field(ge=0)
    cost_basis: float = Field(ge=0)


class HoldingOut(HoldingIn):
    id: int
    current_price: float | None = None
    market_value: float | None = None
    gain_pct: float | None = None


class PortfolioRecommendation(BaseModel):
    holdings: list[HoldingOut]
    total_value: float
    total_cost: float
    total_gain_pct: float
    allocation: list[dict]
    recommendations: list[dict]
    commentary: str
