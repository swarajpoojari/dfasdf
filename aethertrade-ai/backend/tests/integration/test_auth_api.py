"""Authentication API: login, bearer tokens, CSRF, lockout, refresh rotation, logout, password change."""

from __future__ import annotations

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import AppContainer
from app.core.permissions import Role
from app.database.models import AuditLog, AuthSession, User
from tests.conftest import MakeUser
from tests.helpers import CSRF, OWNER_EMAIL, OWNER_PASSWORD, FrozenClock, bearer_token, login

ME = "/api/v1/users/me"
REFRESH = "/api/v1/auth/refresh"


async def _refresh_with(client: httpx.AsyncClient, token: str | None) -> httpx.Response:
    """POST /auth/refresh presenting only this refresh token."""
    client.cookies.clear()
    client.cookies.set("aether_refresh", token or "")
    return await client.post(REFRESH, headers=CSRF)


def _set_cookies(response: httpx.Response) -> dict[str, str]:
    return {h.split("=", 1)[0]: h for h in response.headers.get_list("set-cookie")}


async def _actions(session: AsyncSession) -> list[str]:
    rows = await session.execute(select(AuditLog.action).order_by(AuditLog.id))
    return list(rows.scalars())


async def test_login_sets_hardened_cookies_and_returns_user(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    response = await login(client)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user"]["email"] == OWNER_EMAIL
    assert "credentials:manage" in body["user"]["permissions"]
    assert "password_hash" not in body["user"]

    cookies = _set_cookies(response)
    access = cookies["aether_access"]
    refresh = cookies["aether_refresh"]
    hint = cookies["aether_session"]
    for raw in (access, refresh, hint):
        assert "HttpOnly" in raw
    assert "SameSite=strict" in access
    assert "Path=/;" in access
    assert "SameSite=strict" in refresh
    assert "Path=/api/v1/auth" in refresh
    assert "SameSite=lax" in hint

    me = await client.get(ME)
    assert me.status_code == 200
    assert me.json()["id"] == str(owner.id)
    assert "auth.login.succeeded" in await _actions(db_session)


async def test_invalid_credentials_do_not_reveal_whether_the_account_exists(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    wrong_password = await login(client, password="not-the-password")
    unknown_email = await login(client, email="nobody@aethertrade.dev")
    for response in (wrong_password, unknown_email):
        assert response.status_code == 401
        assert response.headers["content-type"] == "application/problem+json"
    a, b = wrong_password.json(), unknown_email.json()
    assert (a["type"], a["title"], a["detail"]) == (b["type"], b["title"], b["detail"])
    assert a["type"].endswith("/invalid-credentials")
    assert a["request_id"]
    assert (await _actions(db_session)).count("auth.login.failed") == 2


async def test_login_requires_csrf_header(client: httpx.AsyncClient, owner: User) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}
    )
    assert response.status_code == 403
    assert "x-requested-with" in response.json()["detail"]


async def test_account_lockout_after_repeated_failures(
    client: httpx.AsyncClient, owner: User, container: AppContainer
) -> None:
    limit = container.settings.login_failures_per_account_window
    for _ in range(limit - 1):
        assert (await login(client, password="wrong-password-123")).status_code == 401
    # A success before reaching the limit clears the counter.
    assert (await login(client)).status_code == 200
    for _ in range(limit):
        assert (await login(client, password="wrong-password-123")).status_code == 401
    locked = await login(client)  # correct password, but the (account, IP) pair is locked
    assert locked.status_code == 429
    assert int(locked.headers["Retry-After"]) > 0


async def test_per_ip_login_rate_limit(
    client: httpx.AsyncClient, owner: User, container: AppContainer
) -> None:
    container.settings.login_attempts_per_ip_per_minute = 3
    for _ in range(3):
        await login(client, email="nobody@aethertrade.dev")
    response = await login(client)
    assert response.status_code == 429
    assert response.json()["type"].endswith("/rate-limited")


async def test_inactive_user_cannot_log_in(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    owner.is_active = False
    await db_session.commit()
    assert (await login(client)).status_code == 403


async def test_unauthenticated_requests_are_rejected(client: httpx.AsyncClient) -> None:
    response = await client.get(ME)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    garbage = await client.get(ME, headers={"Authorization": "Bearer not-a-jwt"})
    assert garbage.status_code == 401


async def test_bearer_token_flow_and_csrf_exemption(client: httpx.AsyncClient, owner: User) -> None:
    headers = await bearer_token(client)
    assert (await client.get(ME, headers=headers)).status_code == 200
    # Bearer-authenticated writes need no CSRF header (no ambient credentials involved).
    patch = await client.patch(
        "/api/v1/users/me/preferences", json={"theme": "light"}, headers=headers
    )
    assert patch.status_code == 200


async def test_cookie_authenticated_writes_require_csrf_header(
    client: httpx.AsyncClient, owner: User
) -> None:
    await login(client)
    blocked = await client.patch("/api/v1/users/me/preferences", json={"theme": "light"})
    assert blocked.status_code == 403
    allowed = await client.patch(
        "/api/v1/users/me/preferences", json={"theme": "light"}, headers=CSRF
    )
    assert allowed.status_code == 200


async def test_access_token_expires_with_the_clock(
    client: httpx.AsyncClient, owner: User, clock: FrozenClock, container: AppContainer
) -> None:
    await login(client)
    clock.advance(seconds=container.settings.access_token_ttl_seconds + 1)
    # httpx does not drop cookies by max-age against our frozen clock, so the token itself is checked.
    assert (await client.get(ME)).status_code == 401


async def test_refresh_rotates_tokens(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    await login(client)
    first = client.cookies.get("aether_refresh")
    response = await client.post(REFRESH, headers=CSRF)
    assert response.status_code == 200, response.text
    second = client.cookies.get("aether_refresh")
    assert first
    assert second
    assert first != second
    sessions = (await db_session.execute(select(AuthSession))).scalars().all()
    assert len(sessions) == 2
    assert len({s.family_id for s in sessions}) == 1
    assert sorted(str(s.revoked_reason) for s in sessions) == ["None", "rotated"]


async def test_refresh_token_reuse_revokes_the_family(
    client: httpx.AsyncClient, owner: User, clock: FrozenClock, db_session: AsyncSession
) -> None:
    await login(client)
    stolen = client.cookies.get("aether_refresh")
    assert (await client.post(REFRESH, headers=CSRF)).status_code == 200
    current = client.cookies.get("aether_refresh")

    clock.advance(seconds=30)  # beyond the multi-tab grace window
    replay = await _refresh_with(client, stolen)
    assert replay.status_code == 401
    assert "auth.refresh.reuse_detected" in await _actions(db_session)

    # The legitimate holder's token is revoked too: the whole family is burned.
    legit = await _refresh_with(client, current)
    assert legit.status_code == 401


async def test_refresh_reuse_within_grace_window_is_treated_as_a_tab_race(
    client: httpx.AsyncClient, owner: User
) -> None:
    await login(client)
    old = client.cookies.get("aether_refresh")
    assert (await client.post(REFRESH, headers=CSRF)).status_code == 200
    current = client.cookies.get("aether_refresh")
    racing = await _refresh_with(client, old)
    assert racing.status_code == 401
    assert racing.json()["type"].endswith("/session-rotated")
    # Must not clear cookies: the browser already holds the fresh session from the winning request.
    assert racing.headers.get_list("set-cookie") == []
    still_valid = await _refresh_with(client, current)
    assert still_valid.status_code == 200


async def test_refresh_failure_clears_cookies(client: httpx.AsyncClient) -> None:
    response = await _refresh_with(client, "bogus")
    assert response.status_code == 401
    cleared = _set_cookies(response)
    assert set(cleared) == {"aether_access", "aether_refresh", "aether_session"}
    assert all("Max-Age=0" in v for v in cleared.values())


async def test_expired_refresh_token_is_rejected(
    client: httpx.AsyncClient, owner: User, clock: FrozenClock, container: AppContainer
) -> None:
    await login(client)
    clock.advance(seconds=container.settings.refresh_token_ttl_seconds + 1)
    assert (await client.post(REFRESH, headers=CSRF)).status_code == 401


async def test_logout_revokes_session_and_clears_cookies(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    await login(client)
    token = client.cookies.get("aether_refresh")
    response = await client.post("/api/v1/auth/logout", headers=CSRF)
    assert response.status_code == 204
    assert all("Max-Age=0" in v for v in _set_cookies(response).values())
    again = await _refresh_with(client, token)
    assert again.status_code == 401
    assert "auth.logout" in await _actions(db_session)


async def test_password_change_revokes_existing_tokens(
    client: httpx.AsyncClient, owner: User, db_session: AsyncSession
) -> None:
    old_bearer = await bearer_token(client)
    await login(client)
    new_password = "an-entirely-new-passphrase"
    response = await client.post(
        "/api/v1/users/me/password",
        json={"current_password": OWNER_PASSWORD, "new_password": new_password},
        headers=CSRF,
    )
    assert response.status_code == 200, response.text
    # Old bearer tokens carry the previous token_version and are now rejected.
    assert (await client.get(ME, headers=old_bearer)).status_code == 401
    # The client that changed the password received fresh cookies and stays signed in.
    assert (await client.get(ME)).status_code == 200
    client.cookies.clear()
    assert (await login(client, password=OWNER_PASSWORD)).status_code == 401
    assert (await login(client, password=new_password)).status_code == 200
    assert "auth.password.changed" in await _actions(db_session)


async def test_password_change_validation(client: httpx.AsyncClient, owner: User) -> None:
    await login(client)
    url = "/api/v1/users/me/password"
    wrong = await client.post(
        url, json={"current_password": "nope-nope-nope", "new_password": "x" * 20}, headers=CSRF
    )
    assert wrong.status_code == 401
    weak = await client.post(
        url, json={"current_password": OWNER_PASSWORD, "new_password": "short"}, headers=CSRF
    )
    assert weak.status_code == 422
    same = await client.post(
        url, json={"current_password": OWNER_PASSWORD, "new_password": OWNER_PASSWORD}, headers=CSRF
    )
    assert same.status_code == 422


async def test_validation_errors_never_echo_input(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"email": "a", "password": "secret-value-123"}, headers=CSRF
    )
    assert response.status_code == 422
    assert "secret-value-123" not in response.text
    assert response.json()["errors"]


async def test_analyst_permissions(client: httpx.AsyncClient, make_user: MakeUser) -> None:
    await make_user(email="analyst@aethertrade.dev", role=Role.ANALYST)
    await login(client, email="analyst@aethertrade.dev")
    me = (await client.get(ME)).json()
    assert "paper:trade" in me["permissions"]
    assert "credentials:manage" not in me["permissions"]


async def test_account_lockout_counts_failures_across_all_ips(
    db_session: AsyncSession, owner: User, container: AppContainer, clock: FrozenClock
) -> None:
    """Rotating the apparent client IP must not allow unlimited password guessing."""
    from app.audit.service import AuditContext
    from app.core.errors import InvalidCredentialsError, RateLimitedError
    from app.identity.service import AuthService

    container.settings.login_failures_per_account_all_ips_window = 3
    service = AuthService(
        db_session, settings=container.settings, clock=clock, limiter=container.limiter
    )
    for i in range(3):
        ctx = AuditContext(ip_address=f"198.51.100.{i + 1}")
        with pytest.raises(InvalidCredentialsError):
            await service.authenticate(OWNER_EMAIL, "wrong-password-123", ctx)
    with pytest.raises(RateLimitedError):
        await service.authenticate(
            OWNER_EMAIL, OWNER_PASSWORD, AuditContext(ip_address="198.51.100.99")
        )
