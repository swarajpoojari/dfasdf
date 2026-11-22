"""Provider catalog and encrypted credential management."""

from __future__ import annotations

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import AppContainer
from app.core.permissions import Role
from app.credentials.service import CredentialService
from app.database.models import AuditLog, ProviderCredential, User
from tests.conftest import MakeUser
from tests.helpers import CSRF, FrozenClock, login

CREDS = "/api/v1/integrations/credentials"
SECRET = "tdk_live_9f8e7d6c5b4a3210"


async def _create(client: httpx.AsyncClient, **overrides: object) -> httpx.Response:
    payload: dict[str, object] = {"provider": "twelve_data", "secrets": {"api_key": SECRET}}
    payload.update(overrides)
    return await client.post(CREDS, json=payload, headers=CSRF)


async def test_catalog_reports_honest_adapter_status(
    client: httpx.AsyncClient, owner: User
) -> None:
    await login(client)
    catalog = (await client.get("/api/v1/integrations/providers")).json()
    ids = {p["id"] for p in catalog}
    assert {"upstox", "zerodha_kite", "twelve_data", "coingecko", "sec_edgar", "anthropic"} <= ids
    # No adapter is implemented in Phase 1, and the API must not suggest otherwise.
    assert {p["adapter_status"] for p in catalog} == {"not_implemented"}


async def test_credential_is_encrypted_and_never_returned(
    client: httpx.AsyncClient,
    owner: User,
    db_session: AsyncSession,
    container: AppContainer,
    clock: FrozenClock,
) -> None:
    await login(client)
    response = await _create(client, label="primary")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["secret_fields"] == ["api_key"]
    assert body["secret_hint"] == SECRET[-4:]
    assert SECRET not in response.text

    listed = await client.get(CREDS)
    assert SECRET not in listed.text
    assert [c["id"] for c in listed.json()] == [body["id"]]

    row = (await db_session.execute(select(ProviderCredential))).scalar_one()
    assert SECRET.encode() not in row.encrypted_payload
    service = CredentialService(db_session, cipher=container.cipher, clock=clock)
    assert await service.reveal("twelve_data") == {"api_key": SECRET}

    audit = (
        await db_session.execute(select(AuditLog).where(AuditLog.action == "credentials.created"))
    ).scalar_one()
    assert SECRET not in str(audit.details)
    assert audit.details["secret_fields"] == ["api_key"]

    catalog = (await client.get("/api/v1/integrations/providers")).json()
    assert next(p for p in catalog if p["id"] == "twelve_data")["active_credentials"] == 1


async def test_short_secrets_get_no_hint(client: httpx.AsyncClient, owner: User) -> None:
    await login(client)
    response = await _create(client, secrets={"api_key": "short-key"})
    assert response.status_code == 201
    assert response.json()["secret_hint"] is None


async def test_provider_without_secrets_accepts_config_only(
    client: httpx.AsyncClient, owner: User
) -> None:
    await login(client)
    response = await _create(
        client,
        provider="sec_edgar",
        secrets={},
        config={"user_agent": "AetherTrade research contact@example.com"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["config"]["user_agent"].startswith("AetherTrade")


@pytest.mark.parametrize(
    ("overrides", "status"),
    [
        ({"provider": "bloomberg"}, 422),
        ({"secrets": {}}, 422),
        ({"secrets": {"api_key": SECRET, "extra": "x"}}, 422),
        ({"secrets": {"api_key": "   "}}, 422),
        ({"config": {"region": "in"}}, 422),
        ({"label": "Has Spaces"}, 422),
        ({"provider": "upstox", "secrets": {"api_key": "a"}}, 422),
    ],
)
async def test_credential_validation(
    client: httpx.AsyncClient, owner: User, overrides: dict[str, object], status: int
) -> None:
    await login(client)
    response = await _create(client, **overrides)
    assert response.status_code == status, response.text
    assert SECRET not in response.text


async def test_duplicate_active_label_conflicts(client: httpx.AsyncClient, owner: User) -> None:
    await login(client)
    assert (await _create(client)).status_code == 201
    assert (await _create(client)).status_code == 409
    assert (await _create(client, label="backup")).status_code == 201


async def test_revoke_destroys_secret_and_allows_relabel(
    client: httpx.AsyncClient,
    owner: User,
    db_session: AsyncSession,
    container: AppContainer,
    clock: FrozenClock,
) -> None:
    await login(client)
    created = (await _create(client)).json()
    assert (await client.delete(f"{CREDS}/{created['id']}", headers=CSRF)).status_code == 204
    assert (await client.get(CREDS)).json() == []
    row = (await db_session.execute(select(ProviderCredential))).scalar_one()
    assert row.revoked_at is not None
    assert row.encrypted_payload == b""
    service = CredentialService(db_session, cipher=container.cipher, clock=clock)
    assert await service.reveal("twelve_data") is None
    assert (await client.delete(f"{CREDS}/{created['id']}", headers=CSRF)).status_code == 404
    assert (await _create(client)).status_code == 201  # label is free again


async def test_missing_encryption_key_returns_503(
    client: httpx.AsyncClient, owner: User, container: AppContainer
) -> None:
    container.cipher = None
    await login(client)
    response = await _create(client)
    assert response.status_code == 503
    assert "AETHER_SECRETS_ENCRYPTION_KEYS" in response.json()["detail"]


async def test_analyst_cannot_manage_credentials(
    client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    await make_user(email="analyst@aethertrade.dev", role=Role.ANALYST)
    await login(client, email="analyst@aethertrade.dev")
    assert (await _create(client)).status_code == 403
