import httpx
import pytest
import gies_auth
from gies_auth import AuthMiddleware, current_user


def _make_app():
    async def inner(scope, receive, send):
        if scope["type"] != "http":
            return
        body = current_user().encode()
        await send({"type": "http.response.start", "status": 200,
                    "headers": [(b"content-type", b"text/plain")]})
        await send({"type": "http.response.body", "body": body})
    return AuthMiddleware(inner)


@pytest.fixture(autouse=True)
def _key(monkeypatch):
    monkeypatch.setattr(gies_auth, "API_KEY", "secret")


@pytest.mark.asyncio
async def test_valid_headers_bind_user():
    transport = httpx.ASGITransport(_make_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/mcp", headers={"X-Gies-Key": "secret", "X-Gies-User": "u123"})
    assert r.status_code == 200 and r.text == "u123"


@pytest.mark.asyncio
@pytest.mark.parametrize("headers", [
    {},
    {"X-Gies-Key": "wrong", "X-Gies-User": "u1"},
    {"X-Gies-Key": "secret"},                        # no user
])
async def test_bad_auth_rejected(headers):
    transport = httpx.ASGITransport(_make_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/mcp", headers=headers)
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_download_path_is_exempt():
    async def inner(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})
    transport = httpx.ASGITransport(AuthMiddleware(inner))
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/download/abc")          # no auth headers
    assert r.status_code == 200
