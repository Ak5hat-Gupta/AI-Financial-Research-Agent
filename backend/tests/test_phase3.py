def test_knowledge_graph(auth_client):
    r = auth_client.get("/api/v1/graph?ticker=AAPL&depth=1")
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["root"] == "C:AAPL"
    assert any(n["kind"] == "company" for n in g["nodes"])
    assert any(e["rel"] == "COMPETES_WITH" for e in g["edges"])


def test_earnings_analyze(auth_client):
    text = ("We are pleased to report record revenue this quarter with strong demand and expanding "
            "margins. Management remains confident in our full-year guidance despite some cost pressure. "
            "We announced a new product launch and a dividend increase.") * 2
    r = auth_client.post("/api/v1/earnings/analyze", json={"text": text, "ticker": "AAPL"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["overall"] in {"positive", "neutral", "negative"}
    assert a["confidence_label"] in {"High", "Guarded", "Low"}
    assert len(a["topics"]) > 0


def test_watchlist_and_notifications(auth_client):
    assert auth_client.post("/api/v1/watchlist", json={"ticker": "NVDA"}).status_code == 201
    wl = auth_client.get("/api/v1/watchlist").json()
    assert any(w["ticker"] == "NVDA" for w in wl)
    assert auth_client.post("/api/v1/watchlist/refresh").json()["created"] >= 1
    notifs = auth_client.get("/api/v1/notifications").json()
    assert len(notifs) >= 1
    assert auth_client.post("/api/v1/notifications/read").status_code == 204


def test_oauth_providers_disabled_in_demo(auth_client):
    r = auth_client.get("/api/v1/auth/oauth/providers")
    assert r.status_code == 200
    assert r.json() == {"google": False, "github": False}
