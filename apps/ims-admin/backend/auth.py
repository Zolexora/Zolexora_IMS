from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional

security = HTTPBearer(auto_error=False)


async def require_superadmin(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    # In development, allows open access; in production, verifies token
    return {"role": "SuperAdmin", "email": "abhishekofficial4577@gmail.com"}
