"""Browser session cookies.

* ``aether_access`` — the access JWT. HttpOnly, SameSite=Strict, path ``/``.
* ``aether_refresh`` — the opaque refresh token. HttpOnly, SameSite=Strict, scoped to the auth routes.
* ``aether_session`` — a non-secret routing hint ("a session probably exists") read by the frontend's
  request proxy to decide whether to redirect to /login. SameSite=Lax so it survives top-level
  navigation from other sites; it grants nothing on its own.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import Response

from app.core.config import Settings

ACCESS_COOKIE = "aether_access"
REFRESH_COOKIE = "aether_refresh"
SESSION_HINT_COOKIE = "aether_session"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _max_age(expires_at: datetime, now: datetime) -> int:
    return max(0, int((expires_at - now).total_seconds()))


def set_session_cookies(
    response: Response,
    settings: Settings,
    *,
    access_token: str,
    access_expires_at: datetime,
    refresh_token: str,
    refresh_expires_at: datetime,
    now: datetime,
) -> None:
    common = {"secure": settings.cookie_secure, "domain": settings.cookie_domain, "httponly": True}
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=_max_age(access_expires_at, now),
        path="/",
        samesite="strict",
        **common,  # type: ignore[arg-type]
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=_max_age(refresh_expires_at, now),
        path=REFRESH_COOKIE_PATH,
        samesite="strict",
        **common,  # type: ignore[arg-type]
    )
    response.set_cookie(
        SESSION_HINT_COOKIE,
        "1",
        max_age=_max_age(refresh_expires_at, now),
        path="/",
        samesite="lax",
        **common,  # type: ignore[arg-type]
    )


def clear_session_cookies(response: Response, settings: Settings) -> None:
    for name, path in (
        (ACCESS_COOKIE, "/"),
        (REFRESH_COOKIE, REFRESH_COOKIE_PATH),
        (SESSION_HINT_COOKIE, "/"),
    ):
        response.delete_cookie(
            name,
            path=path,
            domain=settings.cookie_domain,
            secure=settings.cookie_secure,
            httponly=True,
        )
