"""RFC 9457 problem details and exception handlers.

Services raise :class:`ProblemError` subclasses; handlers translate them (and framework errors) into
``application/problem+json`` responses carrying the request id. Unexpected exceptions become a generic
500 — internal details are logged, never returned.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger
from app.core.request_context import current_request_id

PROBLEM_JSON = "application/problem+json"
PROBLEM_BASE = "https://aethertrade.local/problems/"

log = get_logger(__name__)


class ProblemError(Exception):
    status: int = 500
    slug: str = "internal-error"
    title: str = "Internal server error"

    def __init__(
        self,
        detail: str | None = None,
        *,
        headers: dict[str, str] | None = None,
        errors: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(detail or self.title)
        self.detail = detail
        self.headers = headers or {}
        self.errors = errors


class BadRequestError(ProblemError):
    status, slug, title = 400, "bad-request", "Bad request"


class UnauthorizedError(ProblemError):
    status, slug, title = 401, "unauthorized", "Authentication required"

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(detail, headers={"WWW-Authenticate": "Bearer"})


class InvalidCredentialsError(UnauthorizedError):
    slug, title = "invalid-credentials", "Invalid credentials"


class ForbiddenError(ProblemError):
    status, slug, title = 403, "forbidden", "Forbidden"


class NotFoundError(ProblemError):
    status, slug, title = 404, "not-found", "Not found"


class ConflictError(ProblemError):
    status, slug, title = 409, "conflict", "Conflict"


class UnprocessableError(ProblemError):
    status, slug, title = 422, "validation-error", "Validation error"


class RateLimitedError(ProblemError):
    status, slug, title = 429, "rate-limited", "Too many requests"

    def __init__(self, retry_after: int, detail: str | None = None) -> None:
        super().__init__(
            detail or "Too many attempts. Try again later.",
            headers={"Retry-After": str(max(1, retry_after))},
        )
        self.retry_after = max(1, retry_after)


class ServiceUnavailableError(ProblemError):
    status, slug, title = 503, "service-unavailable", "Service unavailable"


def problem_response(
    request: Request,
    *,
    status: int,
    slug: str,
    title: str,
    detail: str | None,
    headers: dict[str, str] | None = None,
    errors: list[dict[str, Any]] | None = None,
) -> JSONResponse:
    body = {
        "type": PROBLEM_BASE + slug,
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.url.path,
        "request_id": current_request_id(),
        "errors": errors,
    }
    return JSONResponse(body, status_code=status, headers=headers, media_type=PROBLEM_JSON)


def _jsonable_errors(errors: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for err in errors:
        item = {
            "loc": list(err.get("loc", ())),
            "msg": str(err.get("msg", "")),
            "type": err.get("type"),
        }
        out.append(item)  # never echo "input": it may contain passwords or secrets
    return out


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProblemError)
    async def _problem(request: Request, exc: ProblemError) -> JSONResponse:
        return problem_response(
            request,
            status=exc.status,
            slug=exc.slug,
            title=exc.title,
            detail=exc.detail,
            headers=exc.headers,
            errors=exc.errors,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        return problem_response(
            request,
            status=422,
            slug="validation-error",
            title="Validation error",
            detail="The request is invalid.",
            errors=_jsonable_errors(exc.errors()),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        slug = {404: "not-found", 405: "method-not-allowed"}.get(exc.status_code, "http-error")
        return problem_response(
            request,
            status=exc.status_code,
            slug=slug,
            title=str(exc.detail) if exc.detail else "HTTP error",
            detail=None,
            headers=dict(exc.headers) if exc.headers else None,
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled_exception", path=request.url.path)
        return problem_response(
            request,
            status=500,
            slug="internal-error",
            title="Internal server error",
            detail="An unexpected error occurred. Quote the request id when reporting it.",
        )
