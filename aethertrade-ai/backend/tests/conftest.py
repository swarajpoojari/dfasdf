"""Test fixtures.

Integration tests run against real TimescaleDB and Redis — never SQLite or mocks — because the schema
relies on PostgreSQL features (INET, JSONB, partial indexes, triggers) and the rate limiter on Redis
semantics. Configure with:

    AETHER_TEST_DATABASE_URL  (default postgresql+asyncpg://aether:aether_dev@localhost:5432/aethertrade_test)
    AETHER_TEST_REDIS_URL     (default redis://localhost:6379/15)

The test database is dropped, recreated and migrated with Alembic once per session; each test runs in a
transaction that is rolled back afterwards.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable

import httpx
import pytest
from alembic import command
from pydantic import SecretStr
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.audit.service import AuditContext
from app.container import AppContainer
from app.core.config import Environment, RateLimitBackend, Settings
from app.core.crypto import SecretCipher
from app.core.permissions import Role
from app.core.rate_limit import InMemoryRateLimiter
from app.database.models import User
from app.database.session import Database
from app.identity.service import UserService
from app.main import create_app
from tests.helpers import (
    OWNER_EMAIL,
    OWNER_PASSWORD,
    TEST_DATABASE_URL,
    TEST_ENCRYPTION_KEY,
    TEST_REDIS_URL,
    FrozenClock,
    alembic_config,
    recreate_database,
)


@pytest.fixture(scope="session")
def database_url() -> str:
    try:
        asyncio.run(recreate_database(TEST_DATABASE_URL))
    except OSError as exc:  # pragma: no cover - environment problem, reported clearly
        pytest.fail(
            f"Cannot reach the test database ({exc}). Start it with "
            "`docker compose up -d db redis` or set AETHER_TEST_DATABASE_URL."
        )
    command.upgrade(alembic_config(TEST_DATABASE_URL), "head")
    return TEST_DATABASE_URL


@pytest.fixture(scope="session")
def base_settings(database_url: str) -> Settings:
    return Settings(
        _env_file=None,
        environment=Environment.TEST,
        database_url=database_url,
        redis_url=TEST_REDIS_URL,
        rate_limit_backend=RateLimitBackend.MEMORY,
        secrets_encryption_keys=SecretStr(TEST_ENCRYPTION_KEY),
        log_json=False,
        log_level="WARNING",
    )


@pytest.fixture
def settings(base_settings: Settings) -> Settings:
    """Per-test copy so a test can tweak limits without affecting others."""
    return base_settings.model_copy()


@pytest.fixture(scope="session")
async def database(base_settings: Settings) -> AsyncIterator[Database]:
    db = Database(base_settings.database_url, pool_size=5)
    yield db
    await db.dispose()


@pytest.fixture
async def db_session(database: Database) -> AsyncIterator[AsyncSession]:
    async with database.engine.connect() as conn:
        outer = await conn.begin()
        session = AsyncSession(
            bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        try:
            yield session
        finally:
            await session.close()
            await outer.rollback()


@pytest.fixture
def clock() -> FrozenClock:
    return FrozenClock()


@pytest.fixture
async def redis() -> AsyncIterator[Redis]:
    client = Redis.from_url(TEST_REDIS_URL)
    await client.flushdb()
    yield client
    await client.flushdb()
    await client.aclose()


@pytest.fixture
def container(
    settings: Settings, database: Database, redis: Redis, clock: FrozenClock
) -> AppContainer:
    keys = settings.secrets_encryption_keys
    return AppContainer(
        settings=settings,
        database=database,
        redis=redis,
        limiter=InMemoryRateLimiter(),
        cipher=SecretCipher.from_setting(keys.get_secret_value() if keys else None),
        clock=clock,
    )


@pytest.fixture
async def client(
    container: AppContainer, db_session: AsyncSession
) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(container=container)

    async def _session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_session] = _session
    transport = httpx.ASGITransport(app=app, client=("203.0.113.10", 51000))
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


MakeUser = Callable[..., Awaitable[User]]


@pytest.fixture
def make_user(db_session: AsyncSession, settings: Settings, clock: FrozenClock) -> MakeUser:
    async def _make(
        email: str = OWNER_EMAIL,
        password: str = OWNER_PASSWORD,
        role: Role = Role.OWNER,
        name: str = "Test User",
    ) -> User:
        return await UserService(db_session, settings=settings, clock=clock).create_user(
            email=email, display_name=name, password=password, role=role, ctx=AuditContext()
        )

    return _make


@pytest.fixture
async def owner(make_user: MakeUser) -> User:
    return await make_user()
