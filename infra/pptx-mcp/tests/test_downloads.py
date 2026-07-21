import httpx
import pytest
from starlette.applications import Starlette
from starlette.routing import Route
import gies_downloads as dl


def _client(tmp_path):
    app = Starlette(routes=[Route("/download/{token}", dl.download)])
    return httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://t")


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    dl._tokens.clear()
    monkeypatch.setattr(dl, "PUBLIC_URL", "http://t")


@pytest.mark.asyncio
async def test_mint_then_download_ok(tmp_path):
    f = tmp_path / "deck.pptx"
    f.write_bytes(b"PK\x03\x04fake")
    url = dl.download_url(str(f))
    assert url.startswith("http://t/download/")
    async with _client(tmp_path) as c:
        r = await c.get(url.replace("http://t", ""))
    assert r.status_code == 200
    assert "presentationml" in r.headers["content-type"]
    assert r.headers["content-disposition"].endswith('filename="deck.pptx"')


@pytest.mark.asyncio
async def test_unknown_token_404(tmp_path):
    async with _client(tmp_path) as c:
        r = await c.get("/download/nope")
    assert r.status_code == 404 and "expired" in r.text


@pytest.mark.asyncio
async def test_expired_token_404(tmp_path, monkeypatch):
    monkeypatch.setattr(dl, "TOKEN_TTL_SECONDS", -1)
    f = tmp_path / "deck.pptx"; f.write_bytes(b"x")
    url = dl.download_url(str(f))
    async with _client(tmp_path) as c:
        r = await c.get(url.replace("http://t", ""))
    assert r.status_code == 404 and "expired" in r.text
