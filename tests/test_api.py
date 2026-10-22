"""Smoke tests for the FastAPI app (no pipeline run, no network)."""
from fastapi.testclient import TestClient

from app.server import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_download_rejects_unknown_format():
    r = client.get("/api/download/pdf")
    assert r.status_code == 400


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "Deal Intelligence" in r.text
