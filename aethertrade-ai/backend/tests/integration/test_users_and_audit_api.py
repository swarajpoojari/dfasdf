"""Preferences, audit log API and role enforcement."""

from __future__ import annotations

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Role
from app.database.models import AuditLog, User
from tests.conftest import MakeUser
from tests.helpers import CSRF, FrozenClock, login

PREFS = "/api/v1/users/me/preferences"


async def test_default_preferences(client: httpx.AsyncClient, owner: User) -> None:
    await login(client)
    body = (await client.get(PREFS)).json()
    assert body["base_currency"] == "INR"
    assert body["timezone"] == "Asia/Kolkata"
    assert body["number_locale"] == "en-IN"
    assert body["theme"] == "dark"
    assert body["default_paper_capital"] == "100000.00"  # decimals travel as strings
    assert body["paper_capital_bounds"] == {"min": "50000.00", "max": "100000.00"}


async def test_update_preferences_is_audited_with_a_diff(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    await login(client)
    response = await client.patch(
        PREFS,
        json={"default_paper_capital": "75000.50", "timezone": "America/New_York"},
        headers=CSRF,
    )
    assert response.status_code == 200, response.text
    assert response.json()["default_paper_capital"] == "75000.50"
    entry = (
        await db_session.execute(select(AuditLog).where(AuditLog.action == "preferences.updated"))
    ).scalar_one()
    assert entry.details["timezone"] == {"from": "Asia/Kolkata", "to": "America/New_York"}
    assert entry.actor_id == owner.id


async def test_noop_preference_update_writes_no_audit(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    await login(client)
    assert (await client.patch(PREFS, json={"theme": "dark"}, headers=CSRF)).status_code == 200
    found = await db_session.execute(
        select(AuditLog).where(AuditLog.action == "preferences.updated")
    )
    assert found.first() is None


@pytest.mark.parametrize(
    "payload",
    [
        {"default_paper_capital": "49999.99"},
        {"default_paper_capital": "100000.01"},
        {"default_paper_capital": 75000.5},  # floats are rejected outright
        {"default_paper_capital": "75000.123"},  # paise precision only
        {"timezone": "Mars/Olympus_Mons"},
        {"base_currency": "EUR"},
        {"unknown_field": 1},
    ],
)
async def test_invalid_preference_updates(
    client: httpx.AsyncClient, owner: User, payload: dict[str, object]
) -> None:
    await login(client)
    response = await client.patch(PREFS, json=payload, headers=CSRF)
    assert response.status_code == 422, response.text


async def test_viewer_role_is_read_only_for_admin_surfaces(
    client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    await make_user(email="viewer@aethertrade.dev", role=Role.VIEWER)
    await login(client, email="viewer@aethertrade.dev")
    assert (await client.get(PREFS)).status_code == 200
    assert (await client.patch(PREFS, json={"theme": "light"}, headers=CSRF)).status_code == 200
    assert (await client.get("/api/v1/integrations/providers")).status_code == 200
    assert (await client.get("/api/v1/integrations/credentials")).status_code == 403
    assert (await client.get("/api/v1/audit-logs")).status_code == 403


async def test_audit_log_pagination_and_filter(
    client: httpx.AsyncClient, owner: User, clock: FrozenClock
) -> None:
    await login(client)
    for theme in ("light", "dark", "light", "dark", "light"):
        clock.advance(seconds=1)
        await client.patch(PREFS, json={"theme": theme}, headers=CSRF)

    first = (await client.get("/api/v1/audit-logs", params={"limit": 3})).json()
    assert len(first["items"]) == 3
    assert first["next_cursor"]
    second = (
        await client.get("/api/v1/audit-logs", params={"limit": 3, "cursor": first["next_cursor"]})
    ).json()
    ids = [i["id"] for i in first["items"] + second["items"]]
    assert len(ids) == len(set(ids))  # no overlap between pages
    timestamps = [i["occurred_at"] for i in first["items"] + second["items"]]
    assert timestamps == sorted(timestamps, reverse=True)

    filtered = (
        await client.get("/api/v1/audit-logs", params={"action_prefix": "preferences."})
    ).json()
    assert len(filtered["items"]) == 5
    assert {i["action"] for i in filtered["items"]} == {"preferences.updated"}
    assert filtered["items"][0]["ip_address"] == "203.0.113.10"


async def test_audit_log_rejects_bad_cursor(client: httpx.AsyncClient, owner: User) -> None:
    await login(client)
    response = await client.get("/api/v1/audit-logs", params={"cursor": "!!!"})
    assert response.status_code == 400
