"""Audit log persistence (insert and read only — the table rejects updates and deletes)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuditLog


class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def add(self, entry: AuditLog) -> AuditLog:
        self._s.add(entry)
        await self._s.flush()
        return entry

    async def list_page(
        self,
        *,
        limit: int,
        before: tuple[datetime, uuid.UUID] | None = None,
        action_prefix: str | None = None,
    ) -> list[AuditLog]:
        stmt = (
            select(AuditLog).order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc()).limit(limit)
        )
        if before is not None:
            ts, last_id = before
            stmt = stmt.where(
                or_(
                    AuditLog.occurred_at < ts,
                    and_(AuditLog.occurred_at == ts, AuditLog.id < last_id),
                )
            )
        if action_prefix:
            escaped = action_prefix.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
            stmt = stmt.where(AuditLog.action.like(escaped + "%", escape="\\"))
        return list((await self._s.execute(stmt)).scalars())
