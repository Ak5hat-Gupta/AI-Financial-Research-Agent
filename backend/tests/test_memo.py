def test_memo_generation(auth_client):
    r = auth_client.post("/api/v1/memo?live=false", json={"ticker": "AAPL"})
    assert r.status_code == 200, r.text
    m = r.json()
    assert m["id"]
    assert m["rating"] in {"Buy", "Hold", "Sell"}
    assert len(m["sections"]) >= 8
    assert any(s["title"] == "Executive Summary" for s in m["sections"])


def test_memo_list_and_pdf(auth_client):
    created = auth_client.post("/api/v1/memo?live=false", json={"ticker": "MSFT"}).json()
    lst = auth_client.get("/api/v1/memo")
    assert lst.status_code == 200
    assert any(x["id"] == created["id"] for x in lst.json())

    pdf = auth_client.get(f"/api/v1/memo/{created['id']}/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content[:4] == b"%PDF"
