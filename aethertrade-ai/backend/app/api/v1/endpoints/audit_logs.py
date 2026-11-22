"""Read-only access to the audit log (owner only)."""

from __future__ import annotations

import base64
import json
import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import SessionDep, require
from app.core.errors import BadRequestError
from app.core.permissions import Permission
from app.database.models import User
from app.database.repositories.audit import AuditLogRepository

router = APIRouter(prefix="/audit-logs", tags=["audit"])


class AuditLogOut(BaseModel):
    id: uuid.UUID
    occurred_at: datetime
    actor_type: str
    actor_id: uuid.UUID | None
    action: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    request_id: str | None
    ip_address: str | None
    details: dict[str, Any]


class AuditLogPage(BaseModel):
    items: list[AuditLogOut]
    next_cursor: str | None


def encode_cursor(ts: datetime, item_id: uuid.UUID) -> str:
    raw = json.dumps([ts.isoformat(), str(item_id)]).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        ts, item_id = json.loads(base64.urlsafe_b64decode(padded))
        return datetime.fromisoformat(ts), uuid.UUID(item_id)
    except (ValueError, TypeError) as exc:
        raise BadRequestError("Invalid cursor.") from exc


@router.get("", response_model=AuditLogPage)
async def list_audit_logs(
    _user: Annotated[User, Depends(require(Permission.AUDIT_READ))],
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    cursor: Annotated[str | None, Query(max_length=256)] = None,
    action_prefix: Annotated[str | None, Query(max_length=128)] = None,
) -> AuditLogPage:
    before = decode_cursor(cursor) if cursor else None
    rows = await AuditLogRepository(session).list_page(
        limit=limit + 1, before=before, action_prefix=action_prefix
    )
    page, more = rows[:limit], len(rows) > limit
    items = [
        AuditLogOut(
            id=r.id,
            occurred_at=r.occurred_at,
            actor_type=r.actor_type,
            actor_id=r.actor_id,
            action=r.action,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            request_id=r.request_id,
            ip_address=str(r.ip_address) if r.ip_address is not None else None,
            details=r.details,
        )
        for r in page
    ]
    next_cursor = encode_cursor(page[-1].occurred_at, page[-1].id) if more and page else None
    return AuditLogPage(items=items, next_cursor=next_cursor)
