"""Typed application configuration.

All configuration comes from environment variables prefixed with ``AETHER_`` (or a ``.env`` file in
development). Production refuses to start with insecure settings — see
:meth:`Settings._enforce_production_safety`.
"""

from __future__ import annotations

from decimal import Decimal
from enum import StrEnum
from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Shipped only so that development works out of the box. Production rejects it explicitly.
DEVELOPMENT_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me-0000000000"  # noqa: S105

MIN_JWT_SECRET_LENGTH = 32


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class RateLimitBackend(StrEnum):
    REDIS = "redis"
    MEMORY = "memory"


class InsecureConfigurationError(ValueError):
    """Raised when production is configured insecurely."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AETHER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- application -----------------------------------------------------------------------------
    app_name: str = "AetherTrade AI"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_json: bool = True
    expose_api_docs: bool = True

    # --- infrastructure --------------------------------------------------------------------------
    database_url: str = "postgresql+asyncpg://aether:aether_dev@localhost:5432/aethertrade"
    database_pool_size: int = Field(default=10, ge=1, le=100)
    database_echo: bool = False
    redis_url: str = "redis://localhost:6379/0"

    # --- authentication --------------------------------------------------------------------------
    jwt_secret: SecretStr = SecretStr(DEVELOPMENT_JWT_SECRET)
    jwt_issuer: str = "aethertrade"
    access_token_ttl_seconds: int = Field(default=15 * 60, ge=60, le=60 * 60)
    refresh_token_ttl_seconds: int = Field(default=14 * 24 * 3600, ge=3600, le=90 * 24 * 3600)
    cookie_secure: bool = False
    cookie_domain: str | None = None

    # --- secrets at rest -------------------------------------------------------------------------
    # Comma-separated Fernet keys. The first key encrypts; all keys decrypt (rotation).
    # Generate one with: uv run python -m app.cli generate-encryption-key
    secrets_encryption_keys: SecretStr | None = None

    # --- HTTP ------------------------------------------------------------------------------------
    cors_allowed_origins: list[str] = Field(default_factory=list)
    trusted_hosts: list[str] = Field(default_factory=lambda: ["*"])

    # --- rate limiting ---------------------------------------------------------------------------
    rate_limit_backend: RateLimitBackend = RateLimitBackend.REDIS
    login_attempts_per_ip_per_minute: int = Field(default=20, ge=1)
    login_failures_per_account_window: int = Field(default=5, ge=1)
    login_failures_per_account_all_ips_window: int = Field(default=20, ge=1)
    login_failure_window_seconds: int = Field(default=15 * 60, ge=60)
    refresh_attempts_per_ip_per_minute: int = Field(default=60, ge=1)

    # --- product configuration -------------------------------------------------------------------
    paper_capital_min: Decimal = Decimal("50000")
    paper_capital_max: Decimal = Decimal("100000")
    paper_capital_default: Decimal = Decimal("100000")
    allow_fixture_data: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment is Environment.PRODUCTION

    @model_validator(mode="after")
    def _validate_capital_bounds(self) -> Settings:
        if not (
            Decimal(0)
            < self.paper_capital_min
            <= self.paper_capital_default
            <= self.paper_capital_max
        ):
            raise ValueError(
                "paper capital bounds must satisfy 0 < min <= default <= max "
                f"(got {self.paper_capital_min}, {self.paper_capital_default}, "
                f"{self.paper_capital_max})"
            )
        return self

    @model_validator(mode="after")
    def _enforce_production_safety(self) -> Settings:
        if not self.is_production:
            return self
        problems: list[str] = []
        secret = self.jwt_secret.get_secret_value()
        if secret == DEVELOPMENT_JWT_SECRET or len(secret) < MIN_JWT_SECRET_LENGTH:
            problems.append(
                f"AETHER_JWT_SECRET must be a unique value of at least {MIN_JWT_SECRET_LENGTH} chars"
            )
        if self.secrets_encryption_keys is None:
            problems.append("AETHER_SECRETS_ENCRYPTION_KEYS is required")
        if not self.cookie_secure:
            problems.append("AETHER_COOKIE_SECURE must be true")
        if self.debug:
            problems.append("AETHER_DEBUG must be false")
        if self.rate_limit_backend is not RateLimitBackend.REDIS:
            problems.append("AETHER_RATE_LIMIT_BACKEND must be 'redis'")
        if self.allow_fixture_data:
            problems.append("AETHER_ALLOW_FIXTURE_DATA must be false")
        if "*" in self.trusted_hosts:
            problems.append("AETHER_TRUSTED_HOSTS must list explicit host names")
        if problems:
            raise InsecureConfigurationError(
                "Refusing to start in production: " + "; ".join(problems)
            )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
