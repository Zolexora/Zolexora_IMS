import os
import sys
import pytest
from starlette.testclient import TestClient

# Clear cached modules from previous test suites
for mod in ["main", "db", "auth", "models", "d1_adapter"]:
    sys.modules.pop(mod, None)

admin_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if admin_dir not in sys.path:
    sys.path.insert(0, admin_dir)

import main

app = main.app


def test_admin_api_health():
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ims-admin-api"
