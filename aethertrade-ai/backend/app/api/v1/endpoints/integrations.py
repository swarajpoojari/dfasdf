"""Provider catalog and encrypted API-key management."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import AuditContextDep, ContainerDep, SessionDep, require
from app.core.permissions import Permission
from app.credentials.schemas import CredentialCreate, CredentialOut, ProviderOut
from app.credentials.service import CredentialService
from app.database.models import User

router = APIRouter(prefix="/integrations", tags=["integrations"])

Reader = Annotated[User, Depends(require(Permission.READ))]
Manager = Annotated[User, Depends(require(Permission.CREDENTIALS_MANAGE))]


def _service(session: SessionDep, container: ContainerDep) -> CredentialService:
    return CredentialService(session, cipher=container.cipher, clock=container.clock)


ServiceDep = Annotated[CredentialService, Depends(_service)]


@router.get("/providers", response_model=list[ProviderOut])
async def providers(_user: Reader, service: ServiceDep) -> list[ProviderOut]:
    return await service.catalog()


@router.get("/credentials", response_model=list[CredentialOut])
async def list_credentials(_user: Manager, service: ServiceDep) -> list[CredentialOut]:
    return await service.list_active()


@router.post("/credentials", response_model=CredentialOut, status_code=status.HTTP_201_CREATED)
async def create_credential(
    body: CredentialCreate, user: Manager, service: ServiceDep, ctx: AuditContextDep
) -> CredentialOut:
    return await service.create(body, user, ctx.as_user(user.id))


@router.delete("/credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_credential(
    credential_id: uuid.UUID, user: Manager, service: ServiceDep, ctx: AuditContextDep
) -> Response:
    await service.revoke(credential_id, ctx.as_user(user.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
