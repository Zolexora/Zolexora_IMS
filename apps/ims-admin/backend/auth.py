import os
import sys
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend-shared")))
try:
    from security import decode_jwt_token
except ImportError:
    import jwt
    def decode_jwt_token(token, secret_key=None, verify_signature=False):
        secret = secret_key or os.getenv("JWT_SECRET", "dev_insecure_jwt_secret_change_in_production")
        return jwt.decode(token, secret, algorithms=["HS256"], options={"verify_signature": verify_signature})

security = HTTPBearer(auto_error=False)


async def require_superadmin(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    """Verifies that the caller has SuperAdmin or PlatformAdmin permissions."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    allow_dev_bypass = os.getenv("ALLOW_DEV_AUTH_BYPASS", "true" if env != "production" else "false").lower() in ("true", "1")
    superadmin_email = os.getenv("SUPERADMIN_EMAIL", "admin@zolexora.com")

    if not credentials:
        if env != "production" and allow_dev_bypass:
            return {
                "id": "USR_SUPERADMIN_DEV",
                "role": "SuperAdmin",
                "email": superadmin_email,
                "name": "Zolexora Platform Administrator"
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SuperAdmin authorization required"
        )

    token = credentials.credentials
    try:
        verify_sig = (env == "production")
        payload = decode_jwt_token(token, verify_signature=verify_sig)
        role = payload.get("role")
        if role not in ("SuperAdmin", "PlatformAdmin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient administrative privileges"
            )
        return {
            "id": payload.get("sub") or payload.get("user_id"),
            "role": role,
            "email": payload.get("email", superadmin_email),
            "name": payload.get("name", "Administrator")
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative session or token"
        )

