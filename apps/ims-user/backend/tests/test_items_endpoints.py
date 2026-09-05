import os
import sys
import pytest
from starlette.testclient import TestClient

# Add app backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import app


def test_user_api_health():
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ims-user-api"


def test_list_items():
    with TestClient(app) as client:
        resp = client.get("/api/v1/items")
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        assert len(items) > 0
