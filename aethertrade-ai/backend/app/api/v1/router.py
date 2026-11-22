"""Version 1 API router. Only implemented endpoint groups are mounted — planned groups are documented in
docs/API_SPECIFICATION.md rather than exposed as stubs returning placeholder data."""

from fastapi import APIRouter

from app.api.v1.endpoints import audit_logs, auth, integrations, system, users

api_router = APIRouter()
api_router.include_router(system.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(integrations.router)
api_router.include_router(audit_logs.router)
