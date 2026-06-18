"""Portfolio valuation, allocation and rule-based recommendations."""
from __future__ import annotations

from app.models.portfolio import PortfolioHolding
from app.schemas.finance import HoldingOut, PortfolioRecommendation
from app.services.llm import get_llm
from app.services.market_data import get_fundamentals


def build_recommendation(
    holdings: list[PortfolioHolding], live: bool = True
) -> PortfolioRecommendation:
    rows: list[HoldingOut] = []
    total_value = 0.0
    total_cost = 0.0
    sector_value: dict[str, float] = {}

    for h in holdings:
        f = get_fundamentals(h.ticker, live=live)
        price = f.get("price") or 0.0
        mv = price * h.shares
        cost = h.cost_basis * h.shares
        gain_pct = ((price - h.cost_basis) / h.cost_basis * 100) if h.cost_basis else None
        total_value += mv
        total_cost += cost
        sector = f.get("sector") or "Other"
        sector_value[sector] = sector_value.get(sector, 0.0) + mv
        rows.append(
            HoldingOut(
                id=h.id,
                ticker=h.ticker.upper(),
                shares=h.shares,
                cost_basis=h.cost_basis,
                current_price=round(price, 2),
                market_value=round(mv, 2),
                gain_pct=round(gain_pct, 1) if gain_pct is not None else None,
            )
        )

    total_gain_pct = ((total_value - total_cost) / total_cost * 100) if total_cost else 0.0

    allocation = [
        {
            "label": (row.ticker),
            "value": row.market_value or 0.0,
            "weight": round((row.market_value or 0.0) / total_value * 100, 1) if total_value else 0.0,
        }
        for row in rows
    ]

    recommendations = _rules(rows, sector_value, total_value)

    commentary = get_llm().complete(
        "You are a portfolio strategist. Comment on diversification, concentration risk "
        "and rebalancing in 3-4 sentences.",
        f"Holdings: {[(r.ticker, r.weight if hasattr(r,'weight') else None) for r in rows]}\n"
        f"Allocation: {allocation}\nTotal value: {round(total_value,2)}\n"
        f"Total gain%: {round(total_gain_pct,1)}",
        max_tokens=350,
    )

    return PortfolioRecommendation(
        holdings=rows,
        total_value=round(total_value, 2),
        total_cost=round(total_cost, 2),
        total_gain_pct=round(total_gain_pct, 1),
        allocation=allocation,
        recommendations=recommendations,
        commentary=commentary,
    )


def _rules(rows, sector_value, total_value) -> list[dict]:
    recs: list[dict] = []
    if not rows or total_value <= 0:
        return [{"type": "info", "title": "Add holdings", "detail": "Add positions to receive tailored recommendations."}]

    # Concentration check (single position > 35%).
    for r in rows:
        weight = (r.market_value or 0) / total_value * 100
        if weight > 35:
            recs.append({
                "type": "warning",
                "title": f"High concentration in {r.ticker}",
                "detail": f"{r.ticker} is {weight:.0f}% of the portfolio. Consider trimming toward a <25% target.",
            })

    # Sector concentration.
    for sector, val in sector_value.items():
        w = val / total_value * 100
        if w > 55 and sector not in ("", "Other"):
            recs.append({
                "type": "warning",
                "title": f"Overweight {sector}",
                "detail": f"{w:.0f}% of assets sit in {sector}. Diversify across uncorrelated sectors.",
            })

    # Winners / losers.
    for r in rows:
        if r.gain_pct is not None and r.gain_pct <= -20:
            recs.append({
                "type": "danger",
                "title": f"Review {r.ticker} (down {abs(r.gain_pct):.0f}%)",
                "detail": "Re-underwrite the thesis or set a stop; cut losers that have broken down.",
            })
        elif r.gain_pct is not None and r.gain_pct >= 60:
            recs.append({
                "type": "success",
                "title": f"Let {r.ticker} run, but rebalance",
                "detail": f"Up {r.gain_pct:.0f}%. Consider trimming to your target weight to lock gains.",
            })

    if len(rows) < 5:
        recs.append({
            "type": "info",
            "title": "Broaden diversification",
            "detail": f"Only {len(rows)} position(s). 8-15 holdings across sectors reduces idiosyncratic risk.",
        })
    if not recs:
        recs.append({"type": "success", "title": "Well balanced", "detail": "No concentration flags detected."})
    return recs
