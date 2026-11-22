"""Identifier generation.

UUIDv7 (RFC 9562 §5.7): 48-bit Unix millisecond timestamp, version 7, 74 random bits. Time-ordered
UUIDs keep B-tree inserts append-mostly for high-volume tables (orders, fills, audit logs, agent runs).
Ordering is guaranteed across milliseconds; within one millisecond the order is random, which is
acceptable because no code relies on id order for correctness — explicit timestamps do that.
"""

from __future__ import annotations

import secrets
import time
import uuid

_MAX_TIMESTAMP_MS = (1 << 48) - 1


def uuid7(*, timestamp_ms: int | None = None) -> uuid.UUID:
    ms = time.time_ns() // 1_000_000 if timestamp_ms is None else timestamp_ms
    if not 0 <= ms <= _MAX_TIMESTAMP_MS:
        raise ValueError("timestamp_ms out of range for UUIDv7")
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)
    value = (ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    return uuid.UUID(int=value)


def uuid7_timestamp_ms(value: uuid.UUID) -> int:
    if value.version != 7:
        raise ValueError("not a UUIDv7")
    return value.int >> 80
