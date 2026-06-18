from app.schemas.finance import DCFRequest
from app.services.valuation import run_dcf, sensitivity_grid


def test_dcf_basic_math():
    req = DCFRequest(
        ticker="TEST",
        base_fcf=1000.0,
        shares_outstanding=100.0,
        net_debt=0.0,
        current_price=80.0,
        growth_rate=0.10,
        terminal_growth=0.025,
        discount_rate=0.09,
        projection_years=5,
    )
    res = run_dcf(req)

    # Enterprise value = PV of explicit FCFs + PV of terminal value.
    assert abs(res.enterprise_value - (res.pv_of_fcf + res.pv_terminal_value)) < 1.0
    # Equity value = EV - net debt (zero here).
    assert abs(res.equity_value - res.enterprise_value) < 1.0
    # Per-share value is positive and verdict is set.
    assert res.fair_value_per_share and res.fair_value_per_share > 0
    assert res.verdict
    assert len(res.projections) == 5


def test_dcf_terminal_growth_guarded_below_wacc():
    # Terminal growth >= discount rate must be clamped to stay finite.
    req = DCFRequest(base_fcf=500, shares_outstanding=50, terminal_growth=0.05, discount_rate=0.05)
    res = run_dcf(req)
    assert res.assumptions["terminal_growth"] < res.assumptions["discount_rate_wacc"]
    assert res.terminal_value > 0


def test_dcf_upside_direction():
    req = DCFRequest(base_fcf=1000, shares_outstanding=100, current_price=1.0)
    res = run_dcf(req)
    # Cheap price -> big positive upside -> undervalued verdict.
    assert res.upside_pct is not None and res.upside_pct > 0
    assert "undervalued" in res.verdict.lower()


def test_sensitivity_grid_shape():
    req = DCFRequest(base_fcf=1000, shares_outstanding=100, current_price=80)
    grid = sensitivity_grid(req)
    assert len(grid["waccs"]) == 5
    assert len(grid["rows"]) == 5
    assert all(len(row["values"]) == 5 for row in grid["rows"])
