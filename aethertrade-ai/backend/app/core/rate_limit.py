"""Fixed-window rate limiting.

Two backends share one protocol:

* :class:`RedisRateLimiter` — production. ``SET NX EX`` + ``INCR`` + ``TTL`` in one MULTI transaction, so
  a counter can never be left without an expiry.
* :class:`InMemoryRateLimiter` — tests and single-process development only. Production configuration
  refuses it (see ``Settings``).
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from redis.asyncio import Redis

from app.core.errors import RateLimitedError

_PREFIX = "aether:rl:"


@dataclass(frozen=True)
class WindowState:
    count: int
    reset_after: int  # seconds until the window resets (0 when there is no window)


class RateLimiter(Protocol):
    async def increment(self, key: str, window_seconds: int) -> WindowState: ...

    async def peek(self, key: str) -> WindowState: ...

    async def reset(self, key: str) -> None: ...


class RedisRateLimiter:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    async def increment(self, key: str, window_seconds: int) -> WindowState:
        k = _PREFIX + key
        async with self._redis.pipeline(transaction=True) as pipe:
            pipe.set(k, 0, ex=window_seconds, nx=True)
            pipe.incr(k)
            pipe.ttl(k)
            _, count, ttl = await pipe.execute()
        return WindowState(count=int(count), reset_after=max(int(ttl), 0))

    async def peek(self, key: str) -> WindowState:
        k = _PREFIX + key
        async with self._redis.pipeline(transaction=True) as pipe:
            pipe.get(k)
            pipe.ttl(k)
            raw, ttl = await pipe.execute()
        return WindowState(count=int(raw or 0), reset_after=max(int(ttl), 0))

    async def reset(self, key: str) -> None:
        await self._redis.delete(_PREFIX + key)


class InMemoryRateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._windows: dict[str, tuple[int, float]] = {}
        self._lock = asyncio.Lock()

    def _live(self, key: str) -> tuple[int, float] | None:
        entry = self._windows.get(key)
        if entry is not None and entry[1] <= self._clock():
            del self._windows[key]
            return None
        return entry

    async def increment(self, key: str, window_seconds: int) -> WindowState:
        async with self._lock:
            entry = self._live(key)
            if entry is None:
                entry = (0, self._clock() + window_seconds)
            count, expires = entry[0] + 1, entry[1]
            self._windows[key] = (count, expires)
            return WindowState(count=count, reset_after=max(int(expires - self._clock()), 0))

    async def peek(self, key: str) -> WindowState:
        async with self._lock:
            entry = self._live(key)
            if entry is None:
                return WindowState(count=0, reset_after=0)
            return WindowState(count=entry[0], reset_after=max(int(entry[1] - self._clock()), 0))

    async def reset(self, key: str) -> None:
        async with self._lock:
            self._windows.pop(key, None)


async def enforce(limiter: RateLimiter, key: str, *, limit: int, window_seconds: int) -> None:
    """Count one attempt and raise :class:`RateLimitedError` once ``limit`` is exceeded."""
    state = await limiter.increment(key, window_seconds)
    if state.count > limit:
        raise RateLimitedError(retry_after=state.reset_after or window_seconds)
