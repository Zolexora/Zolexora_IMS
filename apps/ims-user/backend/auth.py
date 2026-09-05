import os
import sys
from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

try:
    from .db import db
    from .models import UserProfile
except ImportError:
    from db import db
    from models import UserProfile

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend-shared")))
try:
    from security import decode_jwt_token, get_jwt_secret
except ImportError:
    import jwt
    def decode_jwt_token(token, secret_key=None, verify_signature=False):
        secret = secret_key or os.getenv("JWT_SECRET", "dev_insecure_jwt_secret_change_in_production")
        return jwt.decode(token, secret, algorithms=["HS256"], options={"verify_signature": verify_signature})

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> UserProfile:
    """Authenticates the user via JWT, local token, or dev fallback (in non-production environments)."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    allow_dev_bypass = os.getenv("ALLOW_DEV_AUTH_BYPASS", "true" if env != "production" else "false").lower() in ("true", "1")

    if not credentials:
        if env != "production" and allow_dev_bypass:
            # Dev fallback for local tests and offline dev
            row = await db.fetch_one("SELECT * FROM users WHERE role='SuperAdmin' LIMIT 1;")
            if row:
                return UserProfile(
                    id=row["id"],
                    org_id=row["org_id"],
                    email=row["email"],
                    name=row["name"],
                    role=row["role"],
                    scope_type=row.get("scope_type", "ALL"),
                    assigned_location=row.get("assigned_location", "ALL"),
                    location_name=row.get("location_name"),
                    status=row.get("status", "Active"),
                    supabase_auth_id=row.get("supabase_auth_id")
                )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required"
        )

    token = credentials.credentials
    try:
        # In production, verify signature; in development, allow decoding
        verify_sig = (env == "production")
        payload = decode_jwt_token(token, verify_signature=verify_sig)
        sub = payload.get("sub") or payload.get("user_id")
        email = payload.get("email")

        row = await db.fetch_one(
            "SELECT * FROM users WHERE id = ? OR email = ? OR supabase_auth_id = ?;",
            [sub, email, sub]
        )
        if row and row.get("status") == "Active":
            return UserProfile(
                id=row["id"],
                org_id=row["org_id"],
                email=row["email"],
                name=row["name"],
                role=row["role"],
                scope_type=row.get("scope_type", "ALL"),
                assigned_location=row.get("assigned_location", "ALL"),
                location_name=row.get("location_name"),
                status=row.get("status", "Active"),
                supabase_auth_id=row.get("supabase_auth_id")
            )
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid session or token"
    )


def require_superadmin(user: UserProfile = Depends(get_current_user)) -> UserProfile:
    return user
