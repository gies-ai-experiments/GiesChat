"""Shared-secret auth + per-user identity for the PowerPoint MCP server.

A pure-ASGI middleware validates the X-Gies-Key header (constant-time compare)
and binds X-Gies-User into a ContextVar for the duration of the request, so the
sandbox and state layers can scope work to the caller. The /download path is
exempt: browsers follow those links with no custom headers, and the unguessable
token is the credential.
"""
import hmac
import os
from contextvars import ContextVar

_user: ContextVar[str] = ContextVar("gies_user", default="")

API_KEY = os.environ.get("PPTX_MCP_KEY", "")


def current_user() -> str:
    user = _user.get()
    if not user:
        raise ValueError("No authenticated user in request context")
    return user


class AuthMiddleware:
    def __init__(self, app, *, exempt_prefixes=("/download",)):
        self.app = app
        self.exempt_prefixes = exempt_prefixes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path = scope.get("path", "")
        if any(path.startswith(p) for p in self.exempt_prefixes):
            await self.app(scope, receive, send)
            return
        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        key = headers.get("x-gies-key", "")
        user = headers.get("x-gies-user", "")
        if not API_KEY or not hmac.compare_digest(key, API_KEY) or not user:
            await self._reject(send)
            return
        token = _user.set(user)
        try:
            await self.app(scope, receive, send)
        finally:
            _user.reset(token)

    async def _reject(self, send):
        await send({"type": "http.response.start", "status": 401,
                    "headers": [(b"content-type", b"text/plain")]})
        await send({"type": "http.response.body", "body": b"Unauthorized"})
