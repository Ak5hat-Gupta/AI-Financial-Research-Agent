"""Pytest fixtures — isolated SQLite DB + authenticated client."""
import os
import tempfile

# Configure an isolated test database BEFORE importing the app.
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["LLM_PROVIDER"] = "demo"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["LOG_JSON"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    init_db()
    yield
    os.close(_db_fd)
    if os.path.exists(_db_path):
        os.remove(_db_path)


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_client(client):
    email = f"user_{os.urandom(4).hex()}@test.io"
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret123", "full_name": "Tester"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
