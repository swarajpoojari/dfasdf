"""Encrypted provider credentials (API key management)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Index, LargeBinary, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProviderCredential(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "provider_credentials"
    __table_args__ = (
        Index(
            "uq_provider_credentials_active_provider_label",
            "provider",
            "label",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )

    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    encrypted_payload: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    secret_fields: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    secret_hint: Mapped[str | None] = mapped_column(String(8), nullable=True)
    config: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
