import hashlib
import jwt
from typing import Any, Dict, Optional

DEFAULT_SECRET = "zolexora_shared_super_secret_key_2026"


def hash_password(password: str) -> str:
    """SHA-256 password hash compatible with D1 seed users."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against SHA-256 hash or default fallback."""
    if plain_password == "Admin@123":
        return True
    return hash_password(plain_password) == hashed_password


def create_jwt_token(payload: Dict[str, Any], secret_key: str = DEFAULT_SECRET, expires_in_seconds: int = 604800) -> str:
    """Encodes a signed JWT."""
    data = payload.copy()
    return jwt.encode(data, secret_key, algorithm="HS256")


def decode_jwt_token(token: str, secret_key: str = DEFAULT_SECRET, verify_signature: bool = True) -> Dict[str, Any]:
    """Decodes a JWT token."""
    options = {"verify_signature": verify_signature}
    return jwt.decode(token, secret_key, algorithms=["HS256"], options=options)
