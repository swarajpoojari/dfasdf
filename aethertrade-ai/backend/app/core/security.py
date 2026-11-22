"""Password hashing, access tokens and refresh tokens.

* Passwords: Argon2id via ``argon2-cffi`` (library defaults follow RFC 9106 guidance).
* Access tokens: short-lived HS256 JWTs carrying the user id, role and ``token_version``. Incrementing a
  user's ``token_version`` invalidates every access token issued before it.
* Refresh tokens: opaque random strings; only their SHA-256 is stored (see ``auth_sessions``).
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from pydantic import BaseModel, ConfigDict, ValidationError

from app.core.ids import uuid7

ACCESS_TOKEN_TYPE = "access"  # noqa: S105 - token type label, not a secret
JWT_ALGORITHM = "HS256"
PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 256  # bounds hashing cost for hostile inputs

_hasher = PasswordHasher()
# Verified against when the account does not exist, so response time does not reveal whether an email
# is registered.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(32))


class PasswordPolicyError(ValueError):
    pass


class InvalidTokenError(Exception):
    pass


def validate_password_policy(password: str, *, email: str | None = None) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise PasswordPolicyError(f"password must be at least {PASSWORD_MIN_LENGTH} characters")
    if len(password) > PASSWORD_MAX_LENGTH:
        raise PasswordPolicyError(f"password must be at most {PASSWORD_MAX_LENGTH} characters")
    if password.strip() != password:
        raise PasswordPolicyError("password must not start or end with whitespace")
    if email and password.lower() == email.lower():
        raise PasswordPolicyError("password must not equal the email address")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Constant-work verification. ``password_hash=None`` verifies against a dummy hash."""
    if len(password) > PASSWORD_MAX_LENGTH:
        # Rejected regardless of the account, so the early return reveals nothing about existence.
        return False
    target = password_hash if password_hash is not None else _DUMMY_HASH
    try:
        ok = _hasher.verify(target, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    return ok and password_hash is not None


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


class AccessTokenClaims(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    sub: uuid.UUID
    role: str
    tv: int
    iat: int
    exp: int
    iss: str
    jti: str
    typ: Literal["access"]


@dataclass(frozen=True)
class IssuedToken:
    token: str
    expires_at: datetime


def create_access_token(
    *,
    user_id: uuid.UUID,
    role: str,
    token_version: int,
    secret: str,
    issuer: str,
    ttl_seconds: int,
    now: datetime,
) -> IssuedToken:
    expires_at = now + timedelta(seconds=ttl_seconds)
    payload = {
        "sub": str(user_id),
        "role": role,
        "tv": token_version,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "iss": issuer,
        "jti": str(uuid7()),
        "typ": ACCESS_TOKEN_TYPE,
    }
    return IssuedToken(jwt.encode(payload, secret, algorithm=JWT_ALGORITHM), expires_at)


def decode_access_token(
    token: str, *, secret: str, issuer: str, now: datetime
) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[JWT_ALGORITHM],
            issuer=issuer,
            options={"require": ["sub", "exp", "iat", "iss", "typ"], "verify_exp": False},
        )
        claims = AccessTokenClaims.model_validate(payload)
    except (jwt.PyJWTError, ValidationError) as exc:
        raise InvalidTokenError("invalid access token") from exc
    # Expiry is checked against the injected clock rather than the system clock.
    if claims.exp <= int(now.timestamp()):
        raise InvalidTokenError("access token expired")
    return claims


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
