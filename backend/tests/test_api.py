import io


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_auth_flow(client):
    email = "flow@test.io"
    r = client.post("/api/v1/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 201
    token = r.json()["access_token"]

    # Duplicate registration is rejected.
    r2 = client.post("/api/v1/auth/register", json={"email": email, "password": "password123"})
    assert r2.status_code == 400

    # /me works with the token.
    r3 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 200
    assert r3.json()["email"] == email


def test_protected_requires_auth(client):
    r = client.get("/api/v1/documents")
    assert r.status_code == 401


def test_dcf_endpoint(auth_client):
    r = auth_client.post(
        "/api/v1/valuation/dcf?live=false",
        json={"ticker": "AAPL"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["fair_value_per_share"] is not None
    assert body["verdict"]


def test_ratios_endpoint(auth_client):
    r = auth_client.post("/api/v1/ratios?live=false", json={"ticker": "MSFT"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert 0 <= body["health_score"] <= 100


def test_competitors_endpoint(auth_client):
    r = auth_client.post("/api/v1/competitors?live=false", json={"ticker": "AAPL", "peers": ["MSFT"]})
    assert r.status_code == 200, r.text
    assert len(r.json()["peers"]) >= 2


def test_sentiment_endpoint(auth_client):
    r = auth_client.post("/api/v1/sentiment?live=false", json={"ticker": "TSLA"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["overall"] in {"positive", "neutral", "negative"}
    assert len(body["items"]) > 0


def test_document_upload_and_chat(auth_client):
    text = (
        "Acme Corp reported total revenue of $5.2 billion in fiscal 2025, up 18% year over year. "
        "Gross margin expanded to 44%. The company highlighted risks related to supply chain "
        "concentration and foreign currency exposure. Management guided to continued growth."
    ).encode()
    files = {"file": ("acme_10k.txt", io.BytesIO(text), "text/plain")}
    r = auth_client.post("/api/v1/documents", files=files, data={"ticker": "ACME", "company": "Acme Corp"})
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["status"] == "ready"
    assert doc["char_count"] > 0

    # Ask a question grounded in the uploaded text.
    r2 = auth_client.post("/api/v1/chat/ask", json={"message": "What was revenue?", "document_id": doc["id"]})
    assert r2.status_code == 200, r2.text
    assert r2.json()["answer"]


def test_portfolio_flow(auth_client):
    r = auth_client.post("/api/v1/portfolio/holdings", json={"ticker": "AAPL", "shares": 10, "cost_basis": 150})
    assert r.status_code == 201
    r2 = auth_client.get("/api/v1/portfolio/recommendations?live=false")
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["total_value"] > 0
    assert "recommendations" in body
