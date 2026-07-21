"""Download token store and route for finished decks.

save_presentation mints a random token mapped to the on-disk .pptx path; the
model surfaces the /download/<token> URL and the user's browser fetches it with
no auth headers. Tokens expire after TOKEN_TTL_SECONDS (default 24h).
"""
import os
import secrets
import time
from typing import Dict, Tuple

from starlette.requests import Request
from starlette.responses import FileResponse, PlainTextResponse

TOKEN_TTL_SECONDS = int(os.environ.get("PPTX_DOWNLOAD_TTL", str(24 * 60 * 60)))
PUBLIC_URL = os.environ.get("PUBLIC_URL", "").rstrip("/")

PPTX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
)

_tokens: Dict[str, Tuple[str, float]] = {}   # token -> (path, expires_at_epoch)


def mint(path: str) -> str:
    token = secrets.token_urlsafe(24)
    _tokens[token] = (path, time.time() + TOKEN_TTL_SECONDS)
    return token


def download_url(path: str) -> str:
    return f"{PUBLIC_URL}/download/{mint(path)}"


async def download(request: Request):
    token = request.path_params["token"]
    entry = _tokens.get(token)
    if not entry or entry[1] < time.time():
        _tokens.pop(token, None)
        return PlainTextResponse(
            "This download link has expired — ask GiesChat to save the deck again.",
            status_code=404,
        )
    path, _ = entry
    if not os.path.exists(path):
        return PlainTextResponse("File no longer available.", status_code=404)
    return FileResponse(path, media_type=PPTX_MEDIA_TYPE, filename=os.path.basename(path))
