import os
import hmac
import hashlib
import jwt
from typing import Any, Dict, Optional


def get_jwt_secret() -> str:
    """Retrieves the JWT secret key from environment or fails safely in production."""
    secret = os.getenv("JWT_SECRET")
    if secret:
        return secret
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production":
        raise ValueError("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not configured.")
    return "dev_insecure_jwt_secret_change_in_production"


def hash_password(password: str) -> str:
    """SHA-256 password hash compatible with D1 seed users."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against SHA-256 hash using constant-time comparison."""
    if not plain_password or not hashed_password:
        return False
    calc_hash = hash_password(plain_password)
    return hmac.compare_digest(calc_hash, hashed_password)


def create_jwt_token(payload: Dict[str, Any], secret_key: Optional[str] = None, expires_in_seconds: int = 604800) -> str:
    """Encodes a signed JWT."""
    secret = secret_key or get_jwt_secret()
    data = payload.copy()
    return jwt.encode(data, secret, algorithm="HS256")


def decode_jwt_token(token: str, secret_key: Optional[str] = None, verify_signature: bool = True) -> Dict[str, Any]:
    """Decodes a JWT token."""
    secret = secret_key or get_jwt_secret()
    options = {"verify_signature": verify_signature}
    return jwt.decode(token, secret, algorithms=["HS256"], options=options)

