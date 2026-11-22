"""Persistence for users, preferences and refresh-token sessions."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuthSession, User, UserPreferences


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self._s.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self._s.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def count(self) -> int:
        return int((await self._s.execute(select(func.count()).select_from(User))).scalar_one())

    async def add(self, user: User, preferences: UserPreferences) -> User:
        self._s.add(user)
        await self._s.flush()
        preferences.user_id = user.id
        self._s.add(preferences)
        await self._s.flush()
        return user

    async def get_preferences(self, user_id: uuid.UUID) -> UserPreferences | None:
        return await self._s.get(UserPreferences, user_id)


class AuthSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def add(self, auth_session: AuthSession) -> AuthSession:
        self._s.add(auth_session)
        await self._s.flush()
        return auth_session

    async def get_by_token_hash(
        self, token_hash: str, *, for_update: bool = False
    ) -> AuthSession | None:
        stmt = select(AuthSession).where(AuthSession.token_hash == token_hash)
        if for_update:
            stmt = stmt.with_for_update()
        return (await self._s.execute(stmt)).scalar_one_or_none()

    async def revoke_family(self, family_id: uuid.UUID, *, reason: str, now: datetime) -> int:
        result = await self._s.execute(
            update(AuthSession)
            .where(AuthSession.family_id == family_id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=now, revoked_reason=reason)
        )
        return int(result.rowcount)  # type: ignore[attr-defined]

    async def revoke_all_for_user(self, user_id: uuid.UUID, *, reason: str, now: datetime) -> int:
        result = await self._s.execute(
            update(AuthSession)
            .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=now, revoked_reason=reason)
        )
        return int(result.rowcount)  # type: ignore[attr-defined]
