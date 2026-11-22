"""API key management: validate against the provider catalog, encrypt, store, revoke.

Secrets are decrypted only by :meth:`CredentialService.reveal` for internal adapter use (Phase 2). No API
endpoint returns a secret, and secrets are never placed in audit details or logs.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditContext, AuditService
from app.core.clock import Clock
from app.core.crypto import SecretCipher
from app.core.errors import (
    ConflictError,
    NotFoundError,
    ServiceUnavailableError,
    UnprocessableError,
)
from app.credentials.schemas import CredentialCreate, CredentialOut, ProviderOut
from app.database.models import ProviderCredential, User
from app.database.repositories.credentials import ProviderCredentialRepository
from app.providers.catalog import PROVIDERS, get_provider

MAX_SECRET_LENGTH = 4096
MAX_CONFIG_LENGTH = 512
HINT_MIN_SECRET_LENGTH = 12


def secret_hint(value: str) -> str | None:
    """Last four characters, only for secrets long enough that this does not weaken them."""
    return value[-4:] if len(value) >= HINT_MIN_SECRET_LENGTH else None


def credential_out(c: ProviderCredential) -> CredentialOut:
    return CredentialOut(
        id=c.id,
        provider=c.provider,
        label=c.label,
        secret_fields=list(c.secret_fields),
        secret_hint=c.secret_hint,
        config={str(k): str(v) for k, v in c.config.items()},
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


class CredentialService:
    def __init__(self, session: AsyncSession, *, cipher: SecretCipher | None, clock: Clock) -> None:
        self._s = session
        self._cipher = cipher
        self._clock = clock
        self._repo = ProviderCredentialRepository(session)
        self._audit = AuditService(session, clock)

    def _require_cipher(self) -> SecretCipher:
        if self._cipher is None:
            raise ServiceUnavailableError(
                "Secret encryption is not configured. Set AETHER_SECRETS_ENCRYPTION_KEYS "
                "(generate a key with `python -m app.cli generate-encryption-key`)."
            )
        return self._cipher

    async def catalog(self) -> list[ProviderOut]:
        counts: dict[str, int] = {}
        for c in await self._repo.list_active():
            counts[c.provider] = counts.get(c.provider, 0) + 1
        return [
            ProviderOut(
                id=p.id,
                name=p.name,
                category=p.category.value,
                intended_use=list(p.intended_use),
                secret_fields=list(p.secret_fields),
                config_fields=list(p.config_fields),
                docs_url=p.docs_url,
                adapter_status=p.adapter_status.value,
                active_credentials=counts.get(p.id, 0),
            )
            for p in PROVIDERS
        ]

    async def list_active(self) -> list[CredentialOut]:
        return [credential_out(c) for c in await self._repo.list_active()]

    async def create(self, data: CredentialCreate, user: User, ctx: AuditContext) -> CredentialOut:
        spec = get_provider(data.provider)
        if spec is None:
            raise UnprocessableError(f"Unknown provider {data.provider!r}.")

        expected, given = set(spec.secret_fields), set(data.secrets)
        if given != expected:
            missing, unexpected = sorted(expected - given), sorted(given - expected)
            raise UnprocessableError(
                f"Secret fields for {spec.name} must be exactly {sorted(expected)}"
                + (f"; missing {missing}" if missing else "")
                + (f"; unexpected {unexpected}" if unexpected else "")
                + "."
            )
        unknown_config = sorted(set(data.config) - set(spec.config_fields))
        if unknown_config:
            raise UnprocessableError(f"Unknown config fields for {spec.name}: {unknown_config}.")

        secrets = {k: v.strip() for k, v in data.secrets.items()}
        for field, value in secrets.items():
            if not value:
                raise UnprocessableError(f"Secret field {field!r} must not be empty.")
            if len(value) > MAX_SECRET_LENGTH:
                raise UnprocessableError(f"Secret field {field!r} is too long.")
        config = {k: v.strip() for k, v in data.config.items()}
        for field, value in config.items():
            if len(value) > MAX_CONFIG_LENGTH:
                raise UnprocessableError(f"Config field {field!r} is too long.")

        cipher = self._require_cipher()
        if await self._repo.get_active(spec.id, data.label) is not None:
            raise ConflictError(
                f"An active credential for {spec.name} with label {data.label!r} already exists. "
                "Revoke it first."
            )

        primary = secrets[spec.secret_fields[0]] if spec.secret_fields else ""
        credential = await self._repo.add(
            ProviderCredential(
                provider=spec.id,
                label=data.label,
                encrypted_payload=cipher.encrypt_json(secrets),
                secret_fields=list(spec.secret_fields),
                secret_hint=secret_hint(primary) if primary else None,
                config=config,
                created_by=user.id,
            )
        )
        await self._audit.record(
            ctx,
            "credentials.created",
            entity_type="provider_credential",
            entity_id=credential.id,
            details={
                "provider": spec.id,
                "label": data.label,
                "secret_fields": list(spec.secret_fields),
            },
        )
        await self._s.commit()
        await self._s.refresh(credential)
        return credential_out(credential)

    async def revoke(self, credential_id: uuid.UUID, ctx: AuditContext) -> None:
        credential = await self._repo.get(credential_id)
        if credential is None or credential.revoked_at is not None:
            raise NotFoundError("Credential not found.")
        credential.revoked_at = self._clock()
        credential.encrypted_payload = b""  # destroy the secret; the row stays for audit
        await self._audit.record(
            ctx,
            "credentials.revoked",
            entity_type="provider_credential",
            entity_id=credential.id,
            details={"provider": credential.provider, "label": credential.label},
        )
        await self._s.commit()

    async def reveal(self, provider: str, label: str = "primary") -> dict[str, Any] | None:
        """Decrypt an active credential for internal adapter use. Never expose through the API."""
        credential = await self._repo.get_active(provider, label)
        if credential is None:
            return None
        return self._require_cipher().decrypt_json(credential.encrypted_payload)
