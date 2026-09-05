import os
import sys
import pytest
from unittest.mock import AsyncMock
from starlette.testclient import TestClient

# Add app backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import app
from db import db


def test_user_api_health():
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ims-user-api"
        assert data["database"] == "Cloudflare D1"


def test_list_items(monkeypatch):
    mock_items = [
        {
            "item_code": "ITM_001",
            "org_id": "ORG_ZOLEXORA_001",
            "description": "Special Assam Orthodox Tea Leaves",
            "category": "Tea & Beverages",
            "category_code": "CAT_TEA",
            "uom": "Kg",
            "rate": 650.0,
            "tax_percent": 5.0,
            "min_stock": 10.0,
            "stock_s_001": 25.0,
            "stock_s_002": 15.0,
            "central_stock": 40.0,
            "total_stock": 80.0,
            "total_valuation": 52000.0,
            "preferred_supplier_code": "SUP_021",
            "status": "Active",
            "last_updated": "2026-09-04T00:00:00.000Z"
        }
    ]
    monkeypatch.setattr(db, "query", AsyncMock(return_value=mock_items))
    with TestClient(app) as client:
        resp = client.get("/api/v1/items")
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        assert len(items) == 1
        assert items[0]["item_code"] == "ITM_001"
