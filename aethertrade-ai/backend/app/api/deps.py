"""FastAPI dependencies: container access, database session, audit context, authentication,
permission checks and CSRF protection for cookie-authenticated requests."""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable, Coroutine
from typing import Annotated, Any

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.cookies import ACCESS_COOKIE
from app.audit.service import AuditContext
from app.container import AppContainer
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.permissions import Permission, has_permission
from app.core.request_context import current_request_id
from app.core.security import InvalidTokenError, decode_access_token
from app.database.models import User
from app.database.repositories.identity import UserRepository

CSRF_HEADER = "x-requested-with"
CSRF_HEADER_VALUE = "aethertrade"
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


def get_container(request: Request) -> AppContainer:
    container: AppContainer = request.app.state.container
    return container


ContainerDep = Annotated[AppContainer, Depends(get_container)]


async def get_session(container: ContainerDep) -> AsyncIterator[AsyncSession]:
    async for session in container.database.session():
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_audit_context(request: Request) -> AuditContext:
    return AuditContext(
        actor_type="system",
        request_id=current_request_id(),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


AuditContextDep = Annotated[AuditContext, Depends(get_audit_context)]


def require_csrf_header(request: Request) -> None:
    """Browsers cannot attach custom headers to cross-site form posts or simple requests, so requiring
    one blocks CSRF even if SameSite were bypassed."""
    if request.headers.get(CSRF_HEADER) != CSRF_HEADER_VALUE:
        raise ForbiddenError(f"Missing required header {CSRF_HEADER}: {CSRF_HEADER_VALUE}.")


async def get_current_user(request: Request, session: SessionDep, container: ContainerDep) -> User:
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    else:
        token = request.cookies.get(ACCESS_COOKIE, "")
        if token and request.method not in SAFE_METHODS:
            require_csrf_header(request)
    if not token:
        raise UnauthorizedError("Authentication required.")

    settings = container.settings
    try:
        claims = decode_access_token(
            token,
            secret=settings.jwt_secret.get_secret_value(),
            issuer=settings.jwt_issuer,
            now=container.clock(),
        )
    except InvalidTokenError as exc:
        raise UnauthorizedError("Session expired or invalid.") from exc

    user = await UserRepository(session).get(claims.sub)
    if user is None or not user.is_active or user.token_version != claims.tv:
        raise UnauthorizedError("Session expired or invalid.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require(permission: Permission) -> Callable[..., Coroutine[Any, Any, User]]:
    async def dependency(user: CurrentUser) -> User:
        if not has_permission(user.role, permission):
            raise ForbiddenError(f"Requires permission {permission.value!r}.")
        return user

    return dependency


def user_audit_context(ctx: AuditContext, user: User) -> AuditContext:
    return ctx.as_user(user.id)
