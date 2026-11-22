"""Audit recording. Entries are written in the caller's transaction so an action and its audit record
commit (or roll back) together."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, replace
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.logging import redact
from app.database.models import AuditLog
from app.database.repositories.audit import AuditLogRepository


@dataclass(frozen=True)
class AuditContext:
    """Who is acting and from where. Built per request by the API layer, or by the CLI/workers."""

    actor_type: str = "system"
    actor_id: uuid.UUID | None = None
    request_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None

    def as_user(self, user_id: uuid.UUID) -> AuditContext:
        return replace(self, actor_type="user", actor_id=user_id)


class AuditService:
    def __init__(self, session: AsyncSession, clock: Clock) -> None:
        self._repo = AuditLogRepository(session)
        self._clock = clock

    async def record(
        self,
        ctx: AuditContext,
        action: str,
        *,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        details: dict[str, Any] | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            occurred_at=self._clock(),
            actor_type=ctx.actor_type,
            actor_id=ctx.actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            request_id=ctx.request_id,
            ip_address=ctx.ip_address,
            user_agent=(ctx.user_agent or "")[:512] or None,
            # Defence in depth: callers must not pass secrets, but redact anyway.
            details=redact(details or {}),
        )
        return await self._repo.add(entry)
