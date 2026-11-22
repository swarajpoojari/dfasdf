"""Authentication endpoints. No sign-up endpoint exists: users are created with the CLI."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.cookies import REFRESH_COOKIE, clear_session_cookies, set_session_cookies
from app.api.deps import AuditContextDep, ContainerDep, SessionDep, require_csrf_header
from app.core.errors import UnauthorizedError, problem_response
from app.identity.schemas import LoginRequest, LoginResponse, TokenResponse
from app.identity.service import AuthService, IssuedSession, RotationRaceError, user_out

router = APIRouter(prefix="/auth", tags=["auth"])


def _service(session: SessionDep, container: ContainerDep) -> AuthService:
    return AuthService(
        session, settings=container.settings, clock=container.clock, limiter=container.limiter
    )


ServiceDep = Annotated[AuthService, Depends(_service)]


def _apply(response: Response, container: ContainerDep, issued: IssuedSession) -> LoginResponse:
    set_session_cookies(
        response,
        container.settings,
        access_token=issued.access.token,
        access_expires_at=issued.access.expires_at,
        refresh_token=issued.refresh_token,
        refresh_expires_at=issued.refresh_expires_at,
        now=container.clock(),
    )
    return LoginResponse(user=user_out(issued.user), access_expires_at=issued.access.expires_at)


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(require_csrf_header)],
    summary="Browser login (sets HttpOnly session cookies)",
)
async def login(
    body: LoginRequest,
    response: Response,
    service: ServiceDep,
    container: ContainerDep,
    ctx: AuditContextDep,
) -> LoginResponse:
    issued = await service.login(body.email, body.password, ctx)
    return _apply(response, container, issued)


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="API-client login (OAuth2 password form, returns a bearer token, no cookies)",
)
async def token(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: ServiceDep,
    container: ContainerDep,
    ctx: AuditContextDep,
) -> TokenResponse:
    _user, access = await service.token_login(form.username, form.password, ctx)
    return TokenResponse(
        access_token=access.token, expires_in=container.settings.access_token_ttl_seconds
    )


@router.post(
    "/refresh",
    response_model=LoginResponse,
    dependencies=[Depends(require_csrf_header)],
    summary="Rotate the refresh token and re-issue session cookies",
)
async def refresh(
    request: Request,
    response: Response,
    service: ServiceDep,
    container: ContainerDep,
    ctx: AuditContextDep,
) -> LoginResponse | Response:
    try:
        issued = await service.refresh(request.cookies.get(REFRESH_COOKIE), ctx)
    except RotationRaceError:
        raise  # keep the cookies another concurrent refresh just set
    except UnauthorizedError as exc:
        # Return (not raise) so the cookie deletions are part of the response the client receives;
        # otherwise the session-hint cookie would keep sending the browser back into the app.
        problem = problem_response(
            request,
            status=exc.status,
            slug=exc.slug,
            title=exc.title,
            detail=exc.detail,
            headers=exc.headers,
        )
        clear_session_cookies(problem, container.settings)
        return problem
    return _apply(response, container, issued)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf_header)],
    summary="Revoke the session and clear cookies",
)
async def logout(
    request: Request, service: ServiceDep, container: ContainerDep, ctx: AuditContextDep
) -> Response:
    await service.logout(request.cookies.get(REFRESH_COOKIE), ctx)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookies(response, container.settings)
    return response
