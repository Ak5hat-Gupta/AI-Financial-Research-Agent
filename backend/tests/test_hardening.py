def test_async_memo_runs_inline_without_worker(auth_client):
    r = auth_client.post("/api/v1/memo/async?live=false", json={"ticker": "AAPL"})
    assert r.status_code == 200, r.text
    job_id = r.json()["job_id"]

    s = auth_client.get(f"/api/v1/jobs/{job_id}")
    assert s.status_code == 200, s.text
    body = s.json()
    # No REDIS_URL in tests -> executed inline and recorded as finished.
    assert body["status"] == "finished"
    assert body["result"]["ticker"] == "AAPL"
    assert body["result"]["rating"] in {"Buy", "Hold", "Sell"}


def test_dcf_sensitivity_grid(auth_client):
    r = auth_client.post("/api/v1/valuation/dcf/sensitivity?live=false", json={"ticker": "AAPL"})
    assert r.status_code == 200, r.text
    g = r.json()
    assert len(g["waccs"]) == 5
    assert len(g["terminal_growths"]) == 5
    assert len(g["rows"]) == 5
    assert all(len(row["values"]) == 5 for row in g["rows"])
