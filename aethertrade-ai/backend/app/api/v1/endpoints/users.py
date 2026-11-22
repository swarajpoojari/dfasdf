"""Current-user endpoints: profile, preferences, password."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.cookies import set_session_cookies
from app.api.deps import AuditContextDep, ContainerDep, SessionDep, require
from app.core.permissions import Permission
from app.database.models import User
from app.identity.schemas import (
    LoginResponse,
    PasswordChangeRequest,
    PreferencesOut,
    PreferencesUpdate,
    UserOut,
)
from app.identity.service import AuthService, UserService, user_out

router = APIRouter(prefix="/users", tags=["users"])

Reader = Annotated[User, Depends(require(Permission.READ))]
PreferencesWriter = Annotated[User, Depends(require(Permission.PREFERENCES_WRITE))]


def _users(session: SessionDep, container: ContainerDep) -> UserService:
    return UserService(session, settings=container.settings, clock=container.clock)


UserServiceDep = Annotated[UserService, Depends(_users)]


@router.get("/me", response_model=UserOut)
async def me(user: Reader) -> UserOut:
    return user_out(user)


@router.get("/me/preferences", response_model=PreferencesOut)
async def get_preferences(user: Reader, service: UserServiceDep) -> PreferencesOut:
    return await service.get_preferences(user)


@router.patch("/me/preferences", response_model=PreferencesOut)
async def update_preferences(
    body: PreferencesUpdate, user: PreferencesWriter, service: UserServiceDep, ctx: AuditContextDep
) -> PreferencesOut:
    return await service.update_preferences(user, body, ctx.as_user(user.id))


@router.post("/me/password", response_model=LoginResponse)
async def change_password(
    body: PasswordChangeRequest,
    response: Response,
    user: PreferencesWriter,
    session: SessionDep,
    container: ContainerDep,
    ctx: AuditContextDep,
) -> LoginResponse:
    auth = AuthService(
        session, settings=container.settings, clock=container.clock, limiter=container.limiter
    )
    issued = await auth.change_password(
        user, body.current_password, body.new_password, ctx.as_user(user.id)
    )
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
