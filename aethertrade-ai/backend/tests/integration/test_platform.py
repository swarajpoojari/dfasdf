"""Health, middleware, migrations, audit immutability, Redis rate limiter and CLI."""

from __future__ import annotations

import io
import uuid
from datetime import UTC, datetime

import httpx
import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine

from app import cli
from app.container import AppContainer
from app.core.config import get_settings
from app.core.crypto import SecretCipher
from app.core.rate_limit import RedisRateLimiter
from app.database.base import Base
from app.database.session import Database
from app.main import create_app
from tests.helpers import TEST_DATABASE_URL, alembic_config, login, recreate_database

# --- health & middleware --------------------------------------------------------------------------


async def test_liveness(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/system/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_readiness_with_real_dependencies(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/system/health/ready")
    assert response.status_code == 200, response.text
    assert response.json()["database"]["status"] == "ok"
    assert response.json()["redis"]["status"] == "ok"


async def test_readiness_reports_unavailable_redis(container: AppContainer) -> None:
    broken = Redis.from_url("redis://127.0.0.1:1/0", socket_connect_timeout=0.2)
    container.redis = broken
    app = create_app(container=container)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    ) as c:
        response = await c.get("/api/v1/system/health/ready")
    await broken.aclose()
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["redis"]["status"] == "unavailable"
    assert "127.0.0.1" not in response.text  # no connection details leak


async def test_system_info_requires_auth_and_states_paper_only(
    client: httpx.AsyncClient, owner: object
) -> None:
    assert (await client.get("/api/v1/system/info")).status_code == 401
    await login(client)
    info = (await client.get("/api/v1/system/info")).json()
    assert info["execution_mode"] == "research_and_paper_only"
    assert info["live_trading_available"] is False


async def test_request_id_and_security_headers(client: httpx.AsyncClient) -> None:
    echoed = await client.get("/api/v1/system/health/live", headers={"X-Request-ID": "trace-123"})
    assert echoed.headers["x-request-id"] == "trace-123"
    generated = await client.get("/api/v1/system/health/live", headers={"X-Request-ID": "bad id!"})
    assert generated.headers["x-request-id"] != "bad id!"
    assert uuid.UUID(generated.headers["x-request-id"]).version == 7
    for header in ("x-content-type-options", "x-frame-options", "content-security-policy"):
        assert header in echoed.headers


async def test_unknown_route_is_problem_json(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/markets")  # planned for Phase 2, deliberately not stubbed
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"


async def test_openapi_document_is_served(client: httpx.AsyncClient) -> None:
    spec = (await client.get("/api/v1/openapi.json")).json()
    assert "/api/v1/auth/login" in spec["paths"]
    assert "/api/v1/integrations/credentials" in spec["paths"]


# --- database guarantees -------------------------------------------------------------------------


async def test_audit_log_is_append_only(database: Database) -> None:
    async with database.engine.connect() as conn:
        outer = await conn.begin()
        try:
            await conn.execute(
                text(
                    "INSERT INTO audit_logs (id, occurred_at, actor_type, action) "
                    "VALUES (:id, :ts, 'system', 'test.event')"
                ),
                {"id": uuid.uuid4(), "ts": datetime.now(UTC)},
            )
            for statement in (
                "UPDATE audit_logs SET action = 'tampered'",
                "DELETE FROM audit_logs",
                "TRUNCATE audit_logs",
            ):
                nested = await conn.begin_nested()
                with pytest.raises(DBAPIError, match="append-only"):
                    await conn.execute(text(statement))
                await nested.rollback()
        finally:
            await outer.rollback()


def test_migrations_round_trip_and_match_models() -> None:
    url = TEST_DATABASE_URL.rsplit("/", 1)[0] + "/aethertrade_migration_test"
    import asyncio

    asyncio.run(recreate_database(url))
    cfg = alembic_config(url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")

    async def diff() -> list[object]:
        engine = create_async_engine(url)
        try:
            async with engine.connect() as conn:
                return await conn.run_sync(
                    lambda sync: compare_metadata(MigrationContext.configure(sync), Base.metadata)
                )
        finally:
            await engine.dispose()

    assert asyncio.run(diff()) == []


# --- Redis rate limiter ---------------------------------------------------------------------------


async def test_redis_rate_limiter_against_real_redis(redis: Redis) -> None:
    limiter = RedisRateLimiter(redis)
    assert (await limiter.peek("k")).count == 0
    first = await limiter.increment("k", 30)
    assert first.count == 1
    assert 0 < first.reset_after <= 30
    assert (await limiter.increment("k", 30)).count == 2
    assert 0 < await redis.ttl("aether:rl:k") <= 30  # a window always has an expiry
    assert (await limiter.peek("k")).count == 2
    await limiter.reset("k")
    assert (await limiter.peek("k")).count == 0


# --- CLI ------------------------------------------------------------------------------------------


def test_cli_creates_user_and_generates_keys(
    database_url: str, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("AETHER_DATABASE_URL", database_url)
    get_settings.cache_clear()
    email = f"cli-{uuid.uuid4().hex[:8]}@aethertrade.dev"
    try:
        monkeypatch.setattr("sys.stdin", io.StringIO("a-sufficiently-long-password\n"))
        assert cli.main(["create-user", "--email", email, "--name", "CLI", "--password-stdin"]) == 0
        assert email in capsys.readouterr().out
        monkeypatch.setattr("sys.stdin", io.StringIO("a-sufficiently-long-password\n"))
        assert cli.main(["create-user", "--email", email, "--name", "CLI", "--password-stdin"]) == 1
        assert "already exists" in capsys.readouterr().err
        monkeypatch.setattr("sys.stdin", io.StringIO("short\n"))
        assert (
            cli.main(["create-user", "--email", "x@y.dev", "--name", "X", "--password-stdin"]) == 1
        )
    finally:
        get_settings.cache_clear()

    assert cli.main(["generate-encryption-key"]) == 0
    key = capsys.readouterr().out.strip()
    assert SecretCipher([key]).decrypt_json(SecretCipher([key]).encrypt_json({"a": "b"})) == {
        "a": "b"
    }
