"""Shared test helpers and constants (imported by fixtures and tests)."""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta

import httpx
from alembic.config import Config
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.crypto import SecretCipher

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DATABASE_URL = os.environ.get(
    "AETHER_TEST_DATABASE_URL",
    "postgresql+asyncpg://aether:aether_dev@localhost:5432/aethertrade_test",
)
TEST_REDIS_URL = os.environ.get("AETHER_TEST_REDIS_URL", "redis://localhost:6379/15")
TEST_ENCRYPTION_KEY = SecretCipher.generate_key()

OWNER_EMAIL = "owner@aethertrade.dev"
OWNER_PASSWORD = "correct-horse-battery-staple"
CSRF = {"X-Requested-With": "aethertrade"}


class FrozenClock:
    """Deterministic clock for token expiry and audit timestamps."""

    def __init__(self, start: datetime | None = None) -> None:
        self.now = start or datetime(2026, 11, 22, 9, 15, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, **kwargs: float) -> None:
        self.now += timedelta(**kwargs)


def alembic_config(database_url: str) -> Config:
    cfg = Config(os.path.join(BACKEND_ROOT, "alembic.ini"))
    cfg.attributes["database_url"] = database_url
    return cfg


async def recreate_database(url: str) -> None:
    parsed = make_url(url)
    admin = create_async_engine(parsed.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        async with admin.connect() as conn:
            await conn.exec_driver_sql(f'DROP DATABASE IF EXISTS "{parsed.database}" WITH (FORCE)')
            await conn.exec_driver_sql(f'CREATE DATABASE "{parsed.database}"')
    finally:
        await admin.dispose()


async def login(
    client: httpx.AsyncClient, email: str = OWNER_EMAIL, password: str = OWNER_PASSWORD
) -> httpx.Response:
    return await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}, headers=CSRF
    )


async def bearer_token(
    client: httpx.AsyncClient, email: str = OWNER_EMAIL, password: str = OWNER_PASSWORD
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/token", data={"username": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
