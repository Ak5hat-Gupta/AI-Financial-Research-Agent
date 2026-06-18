"""Financial ratio analysis.

Computes liquidity, profitability, leverage, efficiency and valuation ratios
from a dictionary of fundamentals, scores them against rule-of-thumb
benchmarks, and returns a 0-100 financial-health score.
"""
from __future__ import annotations

from app.schemas.finance import RatioGroup, RatioResponse


def _safe_div(a, b):
    try:
        if a is None or b in (None, 0):
            return None
        return a / b
    except (TypeError, ZeroDivisionError):
        return None


def _status(value, good_high: bool, low: float, high: float) -> str:
    """Classify a metric as good / fair / weak given a band."""
    if value is None:
        return "n/a"
    if good_high:
        if value >= high:
            return "good"
        if value >= low:
            return "fair"
        return "weak"
    else:
        if value <= low:
            return "good"
        if value <= high:
            return "fair"
        return "weak"


_SCORE = {"good": 1.0, "fair": 0.55, "weak": 0.15, "n/a": None}


def compute_ratios(ticker: str, company: str, f: dict) -> RatioResponse:
    g = f.get  # shorthand; all values are floats (mixed units)

    current_ratio = _safe_div(g("current_assets"), g("current_liabilities"))
    quick_ratio = _safe_div(
        (g("current_assets") or 0) - (g("inventory") or 0), g("current_liabilities")
    )
    gross_margin = _safe_div(g("gross_profit"), g("revenue"))
    operating_margin = _safe_div(g("operating_income"), g("revenue"))
    net_margin = _safe_div(g("net_income"), g("revenue"))
    roe = _safe_div(g("net_income"), g("total_equity"))
    roa = _safe_div(g("net_income"), g("total_assets"))
    debt_to_equity = _safe_div(g("total_debt"), g("total_equity"))
    interest_coverage = _safe_div(g("operating_income"), g("interest_expense"))
    asset_turnover = _safe_div(g("revenue"), g("total_assets"))
    pe = _safe_div(g("price"), g("eps"))
    pb = _safe_div(g("market_cap"), g("total_equity"))

    groups = [
        RatioGroup(
            name="Liquidity",
            metrics=[
                _m("Current Ratio", current_ratio, "x", "≥1.5", _status(current_ratio, True, 1.0, 1.5)),
                _m("Quick Ratio", quick_ratio, "x", "≥1.0", _status(quick_ratio, True, 0.7, 1.0)),
            ],
        ),
        RatioGroup(
            name="Profitability",
            metrics=[
                _m("Gross Margin", _pct(gross_margin), "%", "≥40%", _status(gross_margin, True, 0.25, 0.40)),
                _m("Operating Margin", _pct(operating_margin), "%", "≥15%", _status(operating_margin, True, 0.08, 0.15)),
                _m("Net Margin", _pct(net_margin), "%", "≥10%", _status(net_margin, True, 0.05, 0.10)),
                _m("Return on Equity", _pct(roe), "%", "≥15%", _status(roe, True, 0.08, 0.15)),
                _m("Return on Assets", _pct(roa), "%", "≥7%", _status(roa, True, 0.03, 0.07)),
            ],
        ),
        RatioGroup(
            name="Leverage",
            metrics=[
                _m("Debt / Equity", debt_to_equity, "x", "≤1.0", _status(debt_to_equity, False, 1.0, 2.0)),
                _m("Interest Coverage", interest_coverage, "x", "≥4.0", _status(interest_coverage, True, 2.0, 4.0)),
            ],
        ),
        RatioGroup(
            name="Efficiency",
            metrics=[
                _m("Asset Turnover", asset_turnover, "x", "≥0.7", _status(asset_turnover, True, 0.4, 0.7)),
            ],
        ),
        RatioGroup(
            name="Valuation",
            metrics=[
                _m("P / E", pe, "x", "10-25", _status(pe, False, 25.0, 40.0)),
                _m("P / B", pb, "x", "≤3.0", _status(pb, False, 3.0, 6.0)),
            ],
        ),
    ]

    # Aggregate health score over the non-valuation, quality-oriented metrics.
    scores = []
    for grp in groups:
        if grp.name == "Valuation":
            continue
        for metric in grp.metrics:
            s = _SCORE.get(metric["status"])
            if s is not None:
                scores.append(s)
    health = round(100 * sum(scores) / len(scores), 1) if scores else 0.0

    commentary = _commentary(company or ticker, health, groups)
    return RatioResponse(
        ticker=ticker.upper(),
        company=company or ticker.upper(),
        groups=groups,
        health_score=health,
        commentary=commentary,
    )


def _m(label, value, unit, benchmark, status):
    return {
        "label": label,
        "value": round(value, 2) if isinstance(value, (int, float)) else None,
        "unit": unit,
        "benchmark": benchmark,
        "status": status,
    }


def _pct(v):
    return v * 100 if isinstance(v, (int, float)) else None


def _commentary(name: str, health: float, groups) -> str:
    weak = [
        m["label"]
        for grp in groups
        for m in grp.metrics
        if m["status"] == "weak"
    ]
    strong = [
        m["label"]
        for grp in groups
        for m in grp.metrics
        if m["status"] == "good"
    ]
    band = (
        "robust" if health >= 75 else "solid" if health >= 55 else "mixed" if health >= 40 else "fragile"
    )
    parts = [f"{name} shows a {band} financial profile with a health score of {health}/100."]
    if strong:
        parts.append("Strengths: " + ", ".join(strong[:4]) + ".")
    if weak:
        parts.append("Watch areas: " + ", ".join(weak[:4]) + ".")
    return " ".join(parts)
