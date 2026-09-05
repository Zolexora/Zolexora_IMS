import os
import aiosqlite
import httpx
from typing import Any, Dict, List, Optional


class AdminD1Adapter:
    def __init__(self):
        self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.database_id = os.getenv("CLOUDFLARE_D1_DATABASE_ID")
        self.api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        self.sqlite_path = os.getenv(
            "LOCAL_SQLITE_PATH",
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ims-user/backend/data/zolexora.db"))
        )
        self.use_d1 = bool(self.account_id and self.database_id and self.api_token)

    async def init(self):
        pass

    async def query(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        params = params or []
        if self.use_d1:
            url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
            headers = {"Authorization": f"Bearer {self.api_token}", "Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, headers=headers, json={"sql": sql, "params": params})
                return resp.json().get("result", [{}])[0].get("results", [])

        async with aiosqlite.connect(self.sqlite_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(sql, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    async def fetch_one(self, sql: str, params: Optional[List[Any]] = None) -> Optional[Dict[str, Any]]:
        rows = await self.query(sql, params)
        return rows[0] if rows else None

    async def execute(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        params = params or []
        if self.use_d1:
            url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/d1/database/{self.database_id}/query"
            headers = {"Authorization": f"Bearer {self.api_token}", "Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, headers=headers, json={"sql": sql, "params": params})
                meta = resp.json().get("result", [{}])[0].get("meta", {})
                return {"success": True, "rows_affected": meta.get("changes", 0)}

        async with aiosqlite.connect(self.sqlite_path) as db:
            async with db.execute(sql, params) as cursor:
                await db.commit()
                return {"success": True, "rows_affected": cursor.rowcount}
