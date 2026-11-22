"""ASGI middleware: request id, structured access log, security headers.

Implemented as pure ASGI (not ``BaseHTTPMiddleware``) so context variables propagate correctly into
endpoints and streaming responses are not buffered.
"""

from __future__ import annotations

import re
import time

import structlog
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.ids import uuid7
from app.core.logging import get_logger
from app.core.request_context import reset_request_id, set_request_id

REQUEST_ID_HEADER = "x-request-id"
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

log = get_logger("app.access")

_BASE_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}
# JSON API responses never need to load anything. API docs pages are excluded (they load Swagger UI).
_API_CSP = "default-src 'none'; frame-ancestors 'none'"
_DOCS_PREFIXES = ("/api/docs", "/api/redoc")


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp, *, hsts: bool = False) -> None:
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = None
        for name, value in scope.get("headers", []):
            if name == b"x-request-id":
                incoming = value.decode("latin-1")
                break
        request_id = incoming if incoming and _VALID_REQUEST_ID.match(incoming) else str(uuid7())

        token = set_request_id(request_id)
        structlog.contextvars.bind_contextvars(request_id=request_id)
        started = time.perf_counter()
        status_code = 500
        path: str = scope.get("path", "")

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = MutableHeaders(scope=message)
                headers[REQUEST_ID_HEADER] = request_id
                for key, value in _BASE_SECURITY_HEADERS.items():
                    headers.setdefault(key, value)
                if not path.startswith(_DOCS_PREFIXES):
                    headers.setdefault("Content-Security-Policy", _API_CSP)
                if self.hsts:
                    headers.setdefault(
                        "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
                    )
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            client = scope.get("client")
            log.info(
                "http_request",
                method=scope.get("method"),
                path=path,
                status=status_code,
                duration_ms=duration_ms,
                client_ip=client[0] if client else None,
            )
            structlog.contextvars.unbind_contextvars("request_id")
            reset_request_id(token)
