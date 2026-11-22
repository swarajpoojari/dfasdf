"""Injectable clock. Domain code never calls ``datetime.now()`` directly so time can be controlled in
tests (token expiry, rate-limit windows, and later market sessions and backtests)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


def ensure_utc(value: datetime) -> datetime:
    """Normalize an aware datetime to UTC; reject naive datetimes."""
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("naive datetime is not allowed; use timezone-aware UTC timestamps")
    return value.astimezone(UTC)
