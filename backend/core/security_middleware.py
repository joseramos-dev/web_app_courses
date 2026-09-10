"""Pure-ASGI middlewares for response hardening and request size limits.

Deliberately not BaseHTTPMiddleware: that wraps every response in an extra
streaming layer, which costs on each request and interferes with FileResponse
streaming (the lesson file downloads).
"""

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from core.config import ENVIRONMENT, MAX_REQUEST_BYTES

# Swagger UI and ReDoc pull scripts and styles from a CDN and use inline
# styles, so the restrictive API policy would leave them blank.
_DOCS_PATHS = frozenset({"/docs", "/redoc", "/openapi.json", "/docs/oauth2-redirect"})

# The API only ever answers JSON: nothing should be loaded or framed.
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

_BASE_HEADERS = (
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"permissions-policy", b"geolocation=(), microphone=(), camera=()"),
)


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        is_docs = scope.get("path", "") in _DOCS_PATHS

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in _BASE_HEADERS:
                    headers.append(name.decode(), value.decode())
                if not is_docs:
                    headers.append("content-security-policy", _API_CSP)
                # Only over HTTPS: sending HSTS from http://localhost would
                # pin the browser to HTTPS for every local project.
                if ENVIRONMENT == "production":
                    headers.append(
                        "strict-transport-security",
                        "max-age=31536000; includeSubDomains",
                    )
            await send(message)

        await self.app(scope, receive, send_with_headers)


class RequestSizeLimitMiddleware:
    """Reject oversized requests from the Content-Length header, before the
    body is read and before routing."""

    def __init__(self, app: ASGIApp, max_bytes: int = MAX_REQUEST_BYTES) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    declared = int(value)
                except ValueError:
                    break
                if declared > self.max_bytes:
                    await _send_413(send)
                    return
                break

        await self.app(scope, receive, send)


async def _send_413(send: Send) -> None:
    body = b'{"detail":"Request entity too large"}'
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})
