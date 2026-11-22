"""Health, readiness and system information."""

from __future__ import annotations

import asyncio
from importlib.metadata import PackageNotFoundError, version
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.api.deps import ContainerDep, require
from app.core.logging import get_logger
from app.core.permissions import Permission
from app.database.models import User

router = APIRouter(prefix="/system", tags=["system"])
log = get_logger(__name__)

DEPENDENCY_TIMEOUT_SECONDS = 2.0
EXECUTION_MODE = "research_and_paper_only"


def app_version() -> str:
    try:
        return version("aethertrade-backend")
    except PackageNotFoundError:  # pragma: no cover - running from a source tree without install
        return "0.0.0+unknown"


class LiveOut(BaseModel):
    status: Literal["ok"] = "ok"


class DependencyStatus(BaseModel):
    status: Literal["ok", "unavailable"]
    error: str | None = None


class ReadyOut(BaseModel):
    status: Literal["ok", "degraded"]
    database: DependencyStatus
    redis: DependencyStatus


class SystemInfoOut(BaseModel):
    name: str
    version: str
    environment: str
    execution_mode: Literal["research_and_paper_only"]
    live_trading_available: Literal[False]
    fixture_data_allowed: bool


@router.get("/health/live", response_model=LiveOut, summary="Liveness probe")
async def live() -> LiveOut:
    return LiveOut()


@router.get(
    "/health/ready",
    response_model=ReadyOut,
    summary="Readiness probe (database and Redis)",
    responses={503: {"model": ReadyOut}},
)
async def ready(container: ContainerDep) -> JSONResponse:
    async def check(name: str, probe: asyncio.Future[object] | object) -> DependencyStatus:
        try:
            await asyncio.wait_for(probe, timeout=DEPENDENCY_TIMEOUT_SECONDS)  # type: ignore[arg-type]
        except Exception as exc:
            log.warning("dependency_unavailable", dependency=name, error=type(exc).__name__)
            # Only the exception type is reported; messages can contain hostnames or credentials.
            return DependencyStatus(status="unavailable", error=type(exc).__name__)
        return DependencyStatus(status="ok")

    database = await check("database", container.database.ping())
    redis = await check("redis", container.redis.ping())
    healthy = database.status == "ok" and redis.status == "ok"
    body = ReadyOut(status="ok" if healthy else "degraded", database=database, redis=redis)
    return JSONResponse(body.model_dump(), status_code=200 if healthy else 503)


@router.get("/info", response_model=SystemInfoOut, summary="Version and execution mode")
async def info(
    container: ContainerDep, _user: Annotated[User, Depends(require(Permission.READ))]
) -> SystemInfoOut:
    s = container.settings
    return SystemInfoOut(
        name=s.app_name,
        version=app_version(),
        environment=s.environment.value,
        execution_mode=EXECUTION_MODE,
        live_trading_available=False,
        fixture_data_allowed=s.allow_fixture_data,
    )
