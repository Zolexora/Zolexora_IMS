import os
import httpx
from typing import Any, Dict, List, Optional
import sys

# Support importing from backend-shared
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend-shared")))
try:
    from logging import setup_logger
    logger = setup_logger("zolexora.ims_user.d1")
except ImportError:
    import logging
    logger = logging.getLogger("zolexora.ims_user.d1")


class D1Adapter:
    """Pure Cloudflare D1 Serverless SQL Adapter (No local SQLite fallback)."""

    def __init__(
        self,
        account_id: Optional[str] = None,
        database_id: Optional[str] = None,
        api_token: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ):
        self.account_id = account_id or os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.database_id = database_id or os.getenv("CLOUDFLARE_D1_DATABASE_ID")
        self.api_token = api_token or os.getenv("CLOUDFLARE_API_TOKEN")
        self.http_client = http_client
        self.use_d1 = bool(self.account_id and self.database_id and self.api_token)

    async def init(self):
        """Validates Cloudflare D1 configuration readiness."""
        if not self.use_d1:
            logger.warning(
                "Cloudflare D1 credentials not fully configured (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN)."
            )
        else:
            logger.info("Cloudflare D1 Adapter ready for database: %s", self.database_id)

    def _ensure_configured(self):
        if not (self.account_id and self.database_id and self.api_token):
            raise RuntimeError(
                "Cloudflare D1 is not configured. Please set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN."
            )

    async def query(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        self._ensure_configured()
        return await self._query_d1(sql, params or [])

    async def fetch_one(self, sql: str, params: Optional[List[Any]] = None) -> Optional[Dict[str, Any]]:
        rows = await self.query(sql, params)
        return rows[0] if rows else None

    async def execute(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        self._ensure_configured()
        return await self._execute_d1(sql, params or [])

    async def _get_client(self) -> httpx.AsyncClient:
        return self.http_client or httpx.AsyncClient(timeout=15.0)

    async def _query_d1(self, sql: str, params: List[Any]) -> List[Dict[str, Any]]:
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        client = await self._get_client()
        try:
            resp = await client.post(url, headers=headers, json={"sql": sql, "params": params})
            data = resp.json()
            if not data.get("success"):
                raise RuntimeError(f"D1 Query Error: {data.get('errors')}")
            return data.get("result", [{}])[0].get("results", [])
        finally:
            if not self.http_client:
                await client.aclose()

    async def _execute_d1(self, sql: str, params: List[Any]) -> Dict[str, Any]:
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        client = await self._get_client()
        try:
            resp = await client.post(url, headers=headers, json={"sql": sql, "params": params})
            data = resp.json()
            if not data.get("success"):
                raise RuntimeError(f"D1 Execute Error: {data.get('errors')}")
            meta = data.get("result", [{}])[0].get("meta", {})
            return {
                "success": True,
                "rows_affected": meta.get("changes", 0),
                "last_insert_rowid": meta.get("last_row_id")
            }
        finally:
            if not self.http_client:
                await client.aclose()
