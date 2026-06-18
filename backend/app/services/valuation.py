"""Discounted Cash Flow (DCF) valuation engine.

Pure, deterministic finance math — no external services required.
All monetary inputs are in millions unless noted.
"""
from __future__ import annotations

from app.schemas.finance import DCFRequest, DCFResponse, DCFYear


def run_dcf(req: DCFRequest) -> DCFResponse:
    base_fcf = req.base_fcf if req.base_fcf is not None else 1000.0
    shares = req.shares_outstanding if req.shares_outstanding else None
    net_debt = req.net_debt if req.net_debt is not None else 0.0

    g = req.growth_rate
    tg = req.terminal_growth
    r = req.discount_rate
    years = req.projection_years

    # Guard: terminal growth must be below discount rate for a finite Gordon value.
    if tg >= r:
        tg = max(min(r - 0.01, 0.04), 0.0)

    projections: list[DCFYear] = []
    pv_fcf = 0.0
    fcf = base_fcf
    # Linearly decay the growth rate toward terminal growth for realism.
    for year in range(1, years + 1):
        decay = (year - 1) / max(years - 1, 1)
        year_growth = g + (tg - g) * decay
        fcf = fcf * (1 + year_growth)
        discount_factor = 1 / ((1 + r) ** year)
        pv = fcf * discount_factor
        pv_fcf += pv
        projections.append(
            DCFYear(
                year=year,
                fcf=round(fcf, 2),
                discount_factor=round(discount_factor, 4),
                present_value=round(pv, 2),
            )
        )

    # Terminal value via Gordon growth on the final-year FCF.
    terminal_fcf = fcf * (1 + tg)
    terminal_value = terminal_fcf / (r - tg)
    pv_terminal = terminal_value / ((1 + r) ** years)

    enterprise_value = pv_fcf + pv_terminal
    equity_value = enterprise_value - net_debt

    fair_value_per_share = None
    upside = None
    if shares and shares > 0:
        fair_value_per_share = equity_value / shares
    if fair_value_per_share is not None and req.current_price:
        upside = (fair_value_per_share - req.current_price) / req.current_price * 100

    verdict, commentary = _verdict(fair_value_per_share, req.current_price, upside)

    return DCFResponse(
        ticker=req.ticker.upper(),
        company=req.company or req.ticker.upper(),
        assumptions={
            "base_fcf_millions": round(base_fcf, 2),
            "near_term_growth": g,
            "terminal_growth": tg,
            "discount_rate_wacc": r,
            "projection_years": years,
            "net_debt_millions": net_debt,
            "shares_outstanding_millions": shares,
        },
        projections=projections,
        pv_of_fcf=round(pv_fcf, 2),
        terminal_value=round(terminal_value, 2),
        pv_terminal_value=round(pv_terminal, 2),
        enterprise_value=round(enterprise_value, 2),
        equity_value=round(equity_value, 2),
        fair_value_per_share=round(fair_value_per_share, 2) if fair_value_per_share else None,
        current_price=req.current_price,
        upside_pct=round(upside, 1) if upside is not None else None,
        verdict=verdict,
        commentary=commentary,
    )


def _verdict(fair: float | None, price: float | None, upside: float | None) -> tuple[str, str]:
    if fair is None or price is None or upside is None:
        return (
            "Insufficient inputs",
            "Provide shares outstanding and current price to compute an intrinsic "
            "value per share and an upside/downside verdict.",
        )
    if upside >= 25:
        v = "Significantly undervalued"
    elif upside >= 8:
        v = "Undervalued"
    elif upside > -8:
        v = "Fairly valued"
    elif upside > -25:
        v = "Overvalued"
    else:
        v = "Significantly overvalued"
    direction = "above" if upside >= 0 else "below"
    commentary = (
        f"The DCF implies an intrinsic value of ${fair:,.2f} per share versus a market "
        f"price of ${price:,.2f} — roughly {abs(upside):.1f}% {direction} fair value. "
        "Sensitivity to the discount rate and terminal growth is high; stress-test both "
        "before acting."
    )
    return v, commentary


def sensitivity_grid(req: DCFRequest) -> dict:
    """Fair-value-per-share grid across WACC × terminal-growth for a heatmap."""
    waccs = [round(req.discount_rate + d, 4) for d in (-0.02, -0.01, 0.0, 0.01, 0.02)]
    tgs = [round(req.terminal_growth + d, 4) for d in (-0.01, -0.005, 0.0, 0.005, 0.01)]
    rows = []
    for w in waccs:
        cells = []
        for t in tgs:
            r = req.model_copy(update={"discount_rate": w, "terminal_growth": t})
            res = run_dcf(r)
            cells.append(res.fair_value_per_share)
        rows.append({"wacc": w, "values": cells})
    return {"waccs": waccs, "terminal_growths": tgs, "rows": rows}
