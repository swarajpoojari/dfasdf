"""Unit tests for pure core modules (no database, no network)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

import jwt
import pytest
from pydantic import BaseModel, SecretStr, ValidationError

from app.core.clock import ensure_utc
from app.core.config import (
    DEVELOPMENT_JWT_SECRET,
    Environment,
    InsecureConfigurationError,
    RateLimitBackend,
    Settings,
)
from app.core.crypto import SecretCipher, SecretDecryptionError, SecretEncryptionNotConfiguredError
from app.core.errors import RateLimitedError
from app.core.ids import uuid7, uuid7_timestamp_ms
from app.core.logging import REDACTED, redact
from app.core.permissions import Permission, Role, has_permission, permissions_for
from app.core.rate_limit import InMemoryRateLimiter, enforce
from app.core.security import (
    JWT_ALGORITHM,
    PasswordPolicyError,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    validate_password_policy,
    verify_password,
)
from app.core.security import InvalidTokenError as TokenError
from app.core.types import DecimalStr, UtcDatetime

NOW = datetime(2026, 11, 22, 9, 15, tzinfo=UTC)
SECRET = "x" * 48


# --- configuration -------------------------------------------------------------------------------
def _prod(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "_env_file": None,
        "environment": Environment.PRODUCTION,
        "jwt_secret": SecretStr("a-unique-and-long-production-secret-value-123"),
        "secrets_encryption_keys": SecretStr(SecretCipher.generate_key()),
        "cookie_secure": True,
        "rate_limit_backend": RateLimitBackend.REDIS,
        "trusted_hosts": ["aethertrade.example"],
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


def test_development_defaults_are_accepted() -> None:
    settings = Settings(_env_file=None)
    assert settings.environment is Environment.DEVELOPMENT
    assert settings.paper_capital_min == Decimal("50000")
    assert settings.paper_capital_max == Decimal("100000")


def test_secure_production_configuration_is_accepted() -> None:
    assert _prod().is_production


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"jwt_secret": SecretStr(DEVELOPMENT_JWT_SECRET)}, "AETHER_JWT_SECRET"),
        ({"jwt_secret": SecretStr("short")}, "AETHER_JWT_SECRET"),
        ({"secrets_encryption_keys": None}, "AETHER_SECRETS_ENCRYPTION_KEYS"),
        ({"cookie_secure": False}, "AETHER_COOKIE_SECURE"),
        ({"debug": True}, "AETHER_DEBUG"),
        ({"rate_limit_backend": RateLimitBackend.MEMORY}, "AETHER_RATE_LIMIT_BACKEND"),
        ({"allow_fixture_data": True}, "AETHER_ALLOW_FIXTURE_DATA"),
        ({"trusted_hosts": ["*"]}, "AETHER_TRUSTED_HOSTS"),
    ],
)
def test_production_refuses_insecure_configuration(
    override: dict[str, object], message: str
) -> None:
    with pytest.raises(ValidationError, match=message) as info:
        _prod(**override)
    assert isinstance(info.value.errors()[0]["ctx"]["error"], InsecureConfigurationError)


def test_capital_bounds_must_be_ordered() -> None:
    with pytest.raises(ValidationError, match="paper capital bounds"):
        Settings(_env_file=None, paper_capital_default=Decimal("200000"))


# --- identifiers ---------------------------------------------------------------------------------
def test_uuid7_layout_and_ordering() -> None:
    a = uuid7(timestamp_ms=1_700_000_000_000)
    b = uuid7(timestamp_ms=1_700_000_000_001)
    assert a.version == 7
    assert a.variant == uuid.RFC_4122
    assert uuid7_timestamp_ms(a) == 1_700_000_000_000
    assert a < b  # time-ordered across milliseconds
    assert len({uuid7() for _ in range(1000)}) == 1000


def test_uuid7_rejects_out_of_range_and_non_v7() -> None:
    with pytest.raises(ValueError, match="out of range"):
        uuid7(timestamp_ms=-1)
    with pytest.raises(ValueError, match="not a UUIDv7"):
        uuid7_timestamp_ms(uuid.uuid4())


# --- time ----------------------------------------------------------------------------------------
def test_ensure_utc_rejects_naive_and_normalizes_offsets() -> None:
    with pytest.raises(ValueError, match="naive"):
        ensure_utc(datetime(2026, 1, 1))  # noqa: DTZ001 - deliberately naive
    ist = timezone(timedelta(hours=5, minutes=30))
    assert ensure_utc(datetime(2026, 1, 1, 9, 15, tzinfo=ist)) == datetime(
        2026, 1, 1, 3, 45, tzinfo=UTC
    )


# --- decimal / datetime wire types ----------------------------------------------------------------
class _Money(BaseModel):
    amount: DecimalStr


class _When(BaseModel):
    at: UtcDatetime


def test_decimal_str_accepts_strings_and_ints_and_serializes_as_string() -> None:
    assert _Money(amount="75000.50").amount == Decimal("75000.50")
    assert _Money(amount=50000).amount == Decimal(50000)
    assert _Money(amount=Decimal("0.10")).model_dump(mode="json") == {"amount": "0.10"}


@pytest.mark.parametrize("bad", [0.1, 1e5, True])
def test_decimal_str_rejects_floats_and_booleans(bad: object) -> None:
    with pytest.raises(ValidationError):
        _Money(amount=bad)


def test_utc_datetime_rejects_naive_input() -> None:
    with pytest.raises(ValidationError, match="naive"):
        _When(at="2026-11-22T09:15:00")
    assert _When(at="2026-11-22T14:45:00+05:30").at == NOW


# --- passwords ------------------------------------------------------------------------------------
def test_password_hash_round_trip() -> None:
    hashed = hash_password("a long enough password")
    assert hashed.startswith("$argon2id$")
    assert verify_password("a long enough password", hashed)
    assert not verify_password("wrong password!!", hashed)
    assert not verify_password("anything", None)  # dummy hash path never succeeds
    assert not verify_password("x" * 10_000, hashed)


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("short", "at least 12"),
        ("x" * 257, "at most 256"),
        (" leading-space-pass", "whitespace"),
        ("Owner@Example.com", "email"),
    ],
)
def test_password_policy(password: str, message: str) -> None:
    with pytest.raises(PasswordPolicyError, match=message):
        validate_password_policy(password, email="owner@example.com")


# --- access tokens --------------------------------------------------------------------------------
def _token(**overrides: object) -> str:
    issued = create_access_token(
        user_id=uuid.UUID(int=1),
        role="owner",
        token_version=3,
        secret=SECRET,
        issuer="aethertrade",
        ttl_seconds=900,
        now=NOW,
    )
    if not overrides:
        return issued.token
    payload = jwt.decode(
        issued.token, SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False}
    )
    payload.update(overrides)
    return jwt.encode(payload, SECRET, algorithm=JWT_ALGORITHM)


def test_access_token_round_trip() -> None:
    claims = decode_access_token(_token(), secret=SECRET, issuer="aethertrade", now=NOW)
    assert claims.sub == uuid.UUID(int=1)
    assert claims.tv == 3
    assert claims.role == "owner"


def test_access_token_expiry_uses_injected_clock() -> None:
    token = _token()
    decode_access_token(
        token, secret=SECRET, issuer="aethertrade", now=NOW + timedelta(seconds=899)
    )
    with pytest.raises(TokenError, match="expired"):
        decode_access_token(
            token, secret=SECRET, issuer="aethertrade", now=NOW + timedelta(seconds=900)
        )


@pytest.mark.parametrize(
    "variant",
    [
        lambda: _token(typ="refresh"),
        lambda: _token(iss="someone-else"),
        lambda: jwt.encode({"sub": "x"}, SECRET, algorithm=JWT_ALGORITHM),
        lambda: _token()[:-4] + "AAAA",
        lambda: jwt.encode(
            jwt.decode(_token(), SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False}),
            "a-different-secret-of-sufficient-length-000",
            algorithm=JWT_ALGORITHM,
        ),
    ],
)
def test_invalid_access_tokens_are_rejected(variant: object) -> None:
    with pytest.raises(TokenError):
        decode_access_token(variant(), secret=SECRET, issuer="aethertrade", now=NOW)  # type: ignore[operator]


def test_refresh_tokens_are_random_and_hashed() -> None:
    a, b = generate_refresh_token(), generate_refresh_token()
    assert a != b
    assert len(a) >= 64
    assert hash_token(a) == hash_token(a)
    assert len(hash_token(a)) == 64


# --- secrets at rest ------------------------------------------------------------------------------
def test_cipher_round_trip_and_tamper_detection() -> None:
    cipher = SecretCipher([SecretCipher.generate_key()])
    token = cipher.encrypt_json({"api_key": "abc"})
    assert b"abc" not in token
    assert cipher.decrypt_json(token) == {"api_key": "abc"}
    with pytest.raises(SecretDecryptionError):
        cipher.decrypt_json(token[:-3] + b"xyz")


def test_cipher_key_rotation() -> None:
    old, new = SecretCipher.generate_key(), SecretCipher.generate_key()
    token = SecretCipher([old]).encrypt_json({"k": "v"})
    rotating = SecretCipher([new, old])
    rotated = rotating.rotate(token)
    assert SecretCipher([new]).decrypt_json(rotated) == {"k": "v"}
    with pytest.raises(SecretDecryptionError):
        SecretCipher([new]).decrypt_json(token)


def test_cipher_configuration_errors() -> None:
    assert SecretCipher.from_setting(None) is None
    assert SecretCipher.from_setting("  ") is None
    with pytest.raises(SecretEncryptionNotConfiguredError):
        SecretCipher(["not-a-fernet-key"])
    key_a, key_b = SecretCipher.generate_key(), SecretCipher.generate_key()
    assert SecretCipher.from_setting(f"{key_a}, {key_b}") is not None


# --- log redaction --------------------------------------------------------------------------------
def test_redaction_masks_sensitive_keys_recursively() -> None:
    event = {
        "password": "hunter2",
        "nested": {"api_key": "k", "Authorization": "Bearer abc.def", "items": [{"secret": "s"}]},
        "token_version": 4,
        "secret_fields": ["api_key"],
        "message": "sent Bearer eyJhbGciOi.payload.sig to upstream",
        "symbol": "RELIANCE",
    }
    out = redact(event)
    assert out["password"] == REDACTED
    assert out["nested"]["api_key"] == REDACTED
    assert out["nested"]["Authorization"] == REDACTED
    assert out["nested"]["items"][0]["secret"] == REDACTED
    assert out["token_version"] == 4
    assert out["secret_fields"] == ["api_key"]
    assert "eyJhbGciOi" not in out["message"]
    assert out["symbol"] == "RELIANCE"


# --- permissions ----------------------------------------------------------------------------------
def test_role_permissions() -> None:
    assert permissions_for("owner") == frozenset(Permission)
    assert has_permission("analyst", Permission.PAPER_TRADE)
    assert not has_permission("analyst", Permission.CREDENTIALS_MANAGE)
    assert permissions_for(Role.VIEWER) == {Permission.READ, Permission.PREFERENCES_WRITE}
    assert permissions_for("superuser") == frozenset()


# --- in-memory rate limiter -----------------------------------------------------------------------
class _Monotonic:
    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t


async def test_memory_rate_limiter_window_lifecycle() -> None:
    clock = _Monotonic()
    limiter = InMemoryRateLimiter(clock=clock)
    assert (await limiter.peek("k")).count == 0
    assert (await limiter.increment("k", 60)).count == 1
    state = await limiter.increment("k", 60)
    assert state.count == 2
    assert state.reset_after == 60
    clock.t += 61
    assert (await limiter.peek("k")).count == 0
    assert (await limiter.increment("k", 60)).count == 1
    await limiter.reset("k")
    assert (await limiter.peek("k")).count == 0


async def test_enforce_raises_after_limit() -> None:
    limiter = InMemoryRateLimiter(clock=_Monotonic())
    for _ in range(3):
        await enforce(limiter, "ip", limit=3, window_seconds=60)
    with pytest.raises(RateLimitedError) as info:
        await enforce(limiter, "ip", limit=3, window_seconds=60)
    assert info.value.headers["Retry-After"] == "60"
