import os
import sqlite3
import aiosqlite
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
    def __init__(
        self,
        account_id: Optional[str] = None,
        database_id: Optional[str] = None,
        api_token: Optional[str] = None,
        sqlite_path: Optional[str] = None,
        schema_path: Optional[str] = None,
    ):
        self.account_id = account_id or os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.database_id = database_id or os.getenv("CLOUDFLARE_D1_DATABASE_ID")
        self.api_token = api_token or os.getenv("CLOUDFLARE_API_TOKEN")
        self.sqlite_path = sqlite_path or os.getenv(
            "LOCAL_SQLITE_PATH",
            os.path.join(os.path.dirname(__file__), "data", "zolexora.db")
        )
        self.schema_path = schema_path or os.path.join(
            os.path.dirname(__file__), "../migrations/0001_initial_schema.sql"
        )
        self.use_d1 = bool(self.account_id and self.database_id and self.api_token)

    async def init(self):
        """Initializes database schema in local SQLite mode."""
        if not self.use_d1:
            os.makedirs(os.path.dirname(self.sqlite_path), exist_ok=True)
            async with aiosqlite.connect(self.sqlite_path) as db:
                cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='organizations';")
                exists = await cursor.fetchone()
                if not exists and os.path.exists(self.schema_path):
                    with open(self.schema_path, "r", encoding="utf-8") as f:
                        schema_sql = f.read()
                    await db.executescript(schema_sql)
                    await db.commit()
                    logger.info("Initialized local SQLite database from schema: %s", self.sqlite_path)

    async def query(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        params = params or []
        if self.use_d1:
            return await self._query_d1(sql, params)
        return await self._query_sqlite(sql, params)

    async def fetch_one(self, sql: str, params: Optional[List[Any]] = None) -> Optional[Dict[str, Any]]:
        rows = await self.query(sql, params)
        return rows[0] if rows else None

    async def execute(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        params = params or []
        if self.use_d1:
            return await self._execute_d1(sql, params)
        return await self._execute_sqlite(sql, params)

    async def _query_sqlite(self, sql: str, params: List[Any]) -> List[Dict[str, Any]]:
        async with aiosqlite.connect(self.sqlite_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(sql, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    async def _execute_sqlite(self, sql: str, params: List[Any]) -> Dict[str, Any]:
        async with aiosqlite.connect(self.sqlite_path) as db:
            async with db.execute(sql, params) as cursor:
                await db.commit()
                return {
                    "success": True,
                    "rows_affected": cursor.rowcount,
                    "last_insert_rowid": cursor.lastrowid
                }

    async def _query_d1(self, sql: str, params: List[Any]) -> List[Dict[str, Any]]:
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=headers, json={"sql": sql, "params": params})
            data = resp.json()
            if not data.get("success"):
                raise RuntimeError(f"D1 Query Error: {data.get('errors')}")
            return data.get("result", [{}])[0].get("results", [])

    async def _execute_d1(self, sql: str, params: List[Any]) -> Dict[str, Any]:
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
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
