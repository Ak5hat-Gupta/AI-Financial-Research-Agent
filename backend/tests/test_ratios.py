from app.services.ratios import compute_ratios


def _financials():
    return {
        "revenue": 1000, "gross_profit": 600, "operating_income": 250, "net_income": 180,
        "total_assets": 2000, "total_equity": 900, "total_debt": 400,
        "current_assets": 800, "current_liabilities": 400, "inventory": 100,
        "interest_expense": 25, "price": 50, "eps": 4.0, "market_cap": 4500,
    }


def test_ratios_compute_and_score():
    res = compute_ratios("TEST", "Test Co", _financials())
    assert 0 <= res.health_score <= 100
    assert res.groups
    labels = {m["label"] for g in res.groups for m in g.metrics}
    assert "Current Ratio" in labels
    assert "Return on Equity" in labels
    assert "P / E" in labels


def test_ratio_values_correct():
    res = compute_ratios("TEST", "Test Co", _financials())
    metrics = {m["label"]: m for g in res.groups for m in g.metrics}
    # Current ratio = 800 / 400 = 2.0
    assert metrics["Current Ratio"]["value"] == 2.0
    # Net margin = 180 / 1000 = 18%
    assert abs(metrics["Net Margin"]["value"] - 18.0) < 0.01
    # D/E = 400 / 900 = 0.44
    assert abs(metrics["Debt / Equity"]["value"] - 0.44) < 0.01


def test_ratios_handle_missing_data():
    res = compute_ratios("X", "X", {"revenue": 1000})
    # Should not raise; missing inputs become n/a.
    statuses = {m["status"] for g in res.groups for m in g.metrics}
    assert "n/a" in statuses
