"""FastAPI application factory.

Run with ``uvicorn app.main:create_app --factory``. There is no module-level ``app`` so importing this
module has no side effects (tests build their own application with their own container).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.endpoints.system import app_version
from app.api.v1.router import api_router
from app.container import AppContainer
from app.core.config import Settings, get_settings
from app.core.errors import install_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware

API_PREFIX = "/api/v1"
log = get_logger(__name__)


def create_app(
    settings: Settings | None = None, *, container: AppContainer | None = None
) -> FastAPI:
    settings = settings or (container.settings if container else get_settings())
    configure_logging(level=settings.log_level, json=settings.log_json)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        owned = container is None
        app.state.container = container or AppContainer.from_settings(settings)
        log.info(
            "startup",
            environment=settings.environment.value,
            version=app_version(),
            rate_limit_backend=settings.rate_limit_backend.value,
            secret_encryption_configured=app.state.container.cipher is not None,
        )
        try:
            yield
        finally:
            if owned:
                await app.state.container.aclose()
            log.info("shutdown")

    docs = settings.expose_api_docs
    app = FastAPI(
        title=settings.app_name,
        version=app_version(),
        description=(
            "Quantitative research and paper-trading API. Research and simulation only — this API "
            "cannot place real orders."
        ),
        lifespan=lifespan,
        openapi_url=f"{API_PREFIX}/openapi.json" if docs else None,
        docs_url="/api/docs" if docs else None,
        redoc_url="/api/redoc" if docs else None,
    )
    if container is not None:
        # Available immediately for test clients that do not run the lifespan.
        app.state.container = container

    # Middleware order: last added runs first. Request context wraps everything so even rejected
    # hosts and CORS preflights get a request id and an access log line.
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
    if settings.cors_allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allowed_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
            allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-Request-ID"],
            expose_headers=["X-Request-ID", "Retry-After"],
        )
    app.add_middleware(RequestContextMiddleware, hsts=settings.cookie_secure)

    install_exception_handlers(app)
    app.include_router(api_router, prefix=API_PREFIX)
    return app
