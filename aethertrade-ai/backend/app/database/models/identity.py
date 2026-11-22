"""Users, preferences and authentication sessions."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CHAR,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import utc_now
from app.database.base import MONEY, Base, TimestampMixin, UUIDPrimaryKeyMixin

ROLES = ("owner", "analyst", "viewer")
THEMES = ("dark", "light", "system")
SUPPORTED_BASE_CURRENCIES = ("INR", "USD")
NUMBER_LOCALES = ("en-IN", "en-US")


def _in(column: str, values: tuple[str, ...]) -> str:
    quoted = ", ".join(f"'{v}'" for v in values)
    return f"{column} IN ({quoted})"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email = lower(email)", name="email_lowercase"),
        CheckConstraint(_in("role", ROLES), name="role_valid"),
    )

    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    token_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)

    preferences: Mapped[UserPreferences] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="raise"
    )


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (
        CheckConstraint(
            _in("base_currency", SUPPORTED_BASE_CURRENCIES), name="base_currency_valid"
        ),
        CheckConstraint(_in("theme", THEMES), name="theme_valid"),
        CheckConstraint(_in("number_locale", NUMBER_LOCALES), name="number_locale_valid"),
        CheckConstraint("default_paper_capital > 0", name="default_paper_capital_positive"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    base_currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, server_default="INR")
    timezone: Mapped[str] = mapped_column(Text, nullable=False, server_default="Asia/Kolkata")
    number_locale: Mapped[str] = mapped_column(String(8), nullable=False, server_default="en-IN")
    theme: Mapped[str] = mapped_column(String(8), nullable=False, server_default="dark")
    default_paper_capital: Mapped[Decimal] = mapped_column(
        MONEY, nullable=False, server_default="100000"
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, default=utc_now, server_default=func.now(), onupdate=utc_now
    )

    user: Mapped[User] = relationship(back_populates="preferences", lazy="raise")


class AuthSession(UUIDPrimaryKeyMixin, Base):
    """One refresh token. Rotation creates a new row in the same family and marks this one rotated."""

    __tablename__ = "auth_sessions"
    __table_args__ = (
        Index("ix_auth_sessions_family_id", "family_id"),
        CheckConstraint(
            "revoked_reason IS NULL OR revoked_reason IN "
            "('logout', 'rotated', 'reuse_detected', 'password_changed', 'expired')",
            name="revoked_reason_valid",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    family_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    rotated_at: Mapped[datetime | None] = mapped_column(nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
