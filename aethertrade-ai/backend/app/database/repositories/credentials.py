"""Provider credential persistence."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ProviderCredential


class ProviderCredentialRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def add(self, credential: ProviderCredential) -> ProviderCredential:
        self._s.add(credential)
        await self._s.flush()
        return credential

    async def get(self, credential_id: uuid.UUID) -> ProviderCredential | None:
        return await self._s.get(ProviderCredential, credential_id)

    async def get_active(self, provider: str, label: str) -> ProviderCredential | None:
        stmt = select(ProviderCredential).where(
            ProviderCredential.provider == provider,
            ProviderCredential.label == label,
            ProviderCredential.revoked_at.is_(None),
        )
        return (await self._s.execute(stmt)).scalar_one_or_none()

    async def list_active(self) -> list[ProviderCredential]:
        stmt = (
            select(ProviderCredential)
            .where(ProviderCredential.revoked_at.is_(None))
            .order_by(ProviderCredential.provider, ProviderCredential.label)
        )
        return list((await self._s.execute(stmt)).scalars())
