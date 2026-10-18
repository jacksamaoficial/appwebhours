from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# Verified against when the email does not exist, so a failed login takes the
# same time either way and does not reveal which emails have an account.
_DUMMY_HASH = pwd_context.hash("not-a-real-password-0")


def burn_password_check(plain_password: str) -> None:
    pwd_context.verify(plain_password, _DUMMY_HASH)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TokenClaims:
    user_id: str
    # Must match User.token_version: bumping it (password reset) revokes old tokens
    version: int


def _create_token(
    subject: str, version: int, token_type: str, expires_delta: timedelta
) -> str:
    expire = datetime.now(tz=timezone.utc) + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "ver": version,
        "type": token_type,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: str, version: int = 0) -> str:
    return _create_token(
        subject=user_id,
        version=version,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str, version: int = 0) -> str:
    return _create_token(
        subject=user_id,
        version=version,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, expected_type: str) -> TokenClaims:
    """Decode a JWT and return its claims.

    Raises ValueError if the token is invalid or of the wrong type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid token") from exc

    token_type: str | None = payload.get("type")
    if token_type != expected_type:
        raise ValueError(f"Expected token type '{expected_type}', got '{token_type}'")

    return TokenClaims(user_id=str(payload["sub"]), version=int(payload.get("ver", 0)))
