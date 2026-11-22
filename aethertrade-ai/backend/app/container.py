"""Application dependency container.

Long-lived resources (database engine, Redis client, rate limiter, secret cipher, clock) are created
once and injected into request handlers through ``app.state.container``. Tests construct their own
container to control time and isolate state.
"""

from __future__ import annotations

from dataclasses import dataclass

from redis.asyncio import Redis

from app.core.clock import Clock, utc_now
from app.core.config import RateLimitBackend, Settings
from app.core.crypto import SecretCipher
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, RedisRateLimiter
from app.database.session import Database


@dataclass
class AppContainer:
    settings: Settings
    database: Database
    redis: Redis
    limiter: RateLimiter
    cipher: SecretCipher | None
    clock: Clock

    @classmethod
    def from_settings(cls, settings: Settings, *, clock: Clock = utc_now) -> AppContainer:
        redis = Redis.from_url(
            settings.redis_url, socket_connect_timeout=2, socket_timeout=2, decode_responses=False
        )
        limiter: RateLimiter = (
            RedisRateLimiter(redis)
            if settings.rate_limit_backend is RateLimitBackend.REDIS
            else InMemoryRateLimiter()
        )
        keys = settings.secrets_encryption_keys
        return cls(
            settings=settings,
            database=Database(
                settings.database_url,
                pool_size=settings.database_pool_size,
                echo=settings.database_echo,
            ),
            redis=redis,
            limiter=limiter,
            cipher=SecretCipher.from_setting(keys.get_secret_value() if keys else None),
            clock=clock,
        )

    async def aclose(self) -> None:
        await self.redis.aclose()
        await self.database.dispose()
