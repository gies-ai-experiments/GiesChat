"""User-supplied design/template upload for the deck builder.

The model presents an upload card (ui:// resource, rendered in the dock); the
browser POSTs the .pptx straight to /upload/<token> on this container — the
LibreChat file store is never involved. The token is the credential (the route
is exempt from header auth, mirroring /download in reverse): one-shot, per-user,
short TTL, consumed only on a successful save so failed attempts can retry.
Files land in the uploader's sandbox dir, where the existing
create_presentation_from_template picks them up with no build-flow changes.
"""
import io
import re
import time
from typing import Dict, Tuple

from pptx import Presentation
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse, Response
from mcp.server.fastmcp import FastMCP
from mcp.types import EmbeddedResource, TextResourceContents

import gies_sandbox
from gies_auth import current_user
from gies_downloads import PUBLIC_URL

TOKEN_TTL_SECONDS = 15 * 60
MAX_BYTES = 15 * 1024 * 1024

_tokens: Dict[str, Tuple[str, float]] = {}      # token -> (user, expires_at)
_completed: Dict[str, Tuple[str, str]] = {}     # token -> (user, saved_path)

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
}


def mint(user: str) -> str:
    import secrets

    token = secrets.token_urlsafe(24)
    _tokens[token] = (user, time.time() + TOKEN_TTL_SECONDS)
    return token


def _safe_name(raw: str) -> str:
    stem = re.sub(r"[^\w.-]+", "-", raw.rsplit("/", 1)[-1]).strip("-.") or "design"
    if stem.lower().endswith(".pptx"):
        stem = stem[:-5]
    return f"upload-{stem[:60]}.pptx"


async def upload(request: Request) -> Response:
    if request.method == "OPTIONS":
        return Response(status_code=204, headers=_CORS)

    token = request.path_params["token"]
    entry = _tokens.get(token)
    if entry is None or entry[1] < time.time():
        _tokens.pop(token, None)
        return PlainTextResponse(
            "This upload link has expired — ask GiesChat for a fresh upload card.",
            status_code=404, headers=_CORS,
        )
    user, _ = entry

    body = await request.body()
    if len(body) > MAX_BYTES:
        return PlainTextResponse(
            f"File is too large — the limit is {MAX_BYTES // (1024 * 1024)} MB.",
            status_code=413, headers=_CORS,
        )
    try:
        parsed = Presentation(io.BytesIO(body))
    except Exception:
        return PlainTextResponse(
            "That file could not be read as a PowerPoint (.pptx) presentation.",
            status_code=400, headers=_CORS,
        )

    file_name = _safe_name(request.query_params.get("name", "design.pptx"))
    path = gies_sandbox.resolve(file_name, user)
    with open(path, "wb") as f:
        f.write(body)

    _tokens.pop(token, None)
    _completed[token] = (user, path)
    return JSONResponse(
        {"file_name": file_name, "slide_count": len(parsed.slides)},
        headers=_CORS,
    )


def ready(upload_id: str) -> Dict:
    entry = _completed.get(upload_id)
    if entry is None or entry[0] != current_user():
        return {"error": "No completed upload found for this id. Re-present the upload card with present_upload_card."}
    _, path = entry
    try:
        pres = Presentation(path)
    except Exception:
        return {"error": "The uploaded file is no longer readable. Ask the user to upload it again."}
    file_name = path.rsplit("/", 1)[-1]
    return {
        "file_name": file_name,
        "slide_count": len(pres.slides),
        "layouts": [
            {"index": i, "name": layout.name, "placeholders": len(layout.placeholders)}
            for i, layout in enumerate(pres.slide_layouts)
        ],
        "message": (
            f"Design uploaded. Build the deck with create_presentation_from_template "
            f"using template_path \"{file_name}\" and pick layouts from the list above."
        ),
    }


def render_card(token: str) -> str:
    endpoint = f"{PUBLIC_URL}/upload/{token}"
    return (
        CARD_TEMPLATE
        .replace("__ENDPOINT__", endpoint)
        .replace("__TOKEN__", token)
        .replace("__MAX_MB__", str(MAX_BYTES // (1024 * 1024)))
    )


def register_upload_tools(app: FastMCP) -> None:
    @app.tool()
    def present_upload_card() -> list:
        """Show the user a card to upload their own .pptx design/outline. Wait for
        the card to trigger upload_ready — never call upload_ready yourself."""
        token = mint(current_user())
        return [
            EmbeddedResource(
                type="resource",
                resource=TextResourceContents(
                    uri=f"ui://pptx/upload/{token}",
                    mimeType="text/html",
                    text=render_card(token),
                ),
            ),
            {
                "type": "text",
                "text": "Upload card presented. Stop and wait for the user's upload; do not build yet.",
            },
        ]

    @app.tool()
    def upload_ready(upload_id: str) -> Dict:
        """Called by the upload card once the file is stored. Returns the uploaded
        design's file name and layout inventory for building."""
        return ready(upload_id)


CARD_TEMPLATE = """<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: transparent;
         font: 14.5px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { background: #2b2b2b; color: #ececec; border-radius: 12px;
          padding: 8px 12px 8px;
          box-shadow: 0 6px 24px rgba(0,0,0,.35); }
  .title { font-family: "Iowan Old Style", Georgia, serif; font-size: 15px;
           font-weight: 400; margin: 0 0 6px; padding: 0 4px 0; }
  .zone { border: 1.5px dashed #404040; border-radius: 9px; padding: 10px 12px;
          text-align: center; color: #9b9b9b; cursor: pointer; font-size: 13px; }
  .zone:hover, .zone.drag { background: #3a3a3a; color: #ececec; }
  .zone b { color: #ececec; font-weight: 600; }
  .hint { font-size: 13.5px; color: #9b9b9b; margin-top: 10px; padding: 0 6px; }
  .err { color: #e8927c; font-size: 14.5px; margin-top: 10px; padding: 0 6px; display: none; }
  .done { font-size: 15px; color: #9b9b9b; padding: 8px 6px; display: none; }
  .done b { color: #ececec; font-weight: 600; }
  input[type=file] { display: none; }
  .zone:focus-visible { outline: 2px solid #E84A27; outline-offset: 2px; }
</style></head><body>
<div class="card">
  <h2 class="title">Upload your slide design</h2>
  <div class="zone" id="zone" role="button" tabindex="0"
       aria-label="Upload a .pptx design">
    <b>Drop a .pptx here</b> or click to choose a file
  </div>
  <div class="hint">Your deck will be built using this file's layouts, colors, and fonts. Max __MAX_MB__ MB.</div>
  <div class="err" id="err"></div>
  <div class="done" id="done"><b>Design received</b> — building with your layouts.</div>
  <input type="file" id="file" accept=".pptx">
</div>
<script>
  var zone = document.getElementById("zone");
  var input = document.getElementById("file");
  var err = document.getElementById("err");

  function fail(message) { err.textContent = message; err.style.display = "block"; }

  function send(file) {
    err.style.display = "none";
    if (!file) { return; }
    if (!/\\.pptx$/i.test(file.name)) { fail("Please choose a .pptx file."); return; }
    zone.textContent = "Uploading " + file.name + "\\u2026";
    fetch("__ENDPOINT__?name=" + encodeURIComponent(file.name), { method: "POST", body: file })
      .then(function (r) {
        if (!r.ok) { return r.text().then(function (t) { throw new Error(t); }); }
        return r.json();
      })
      .then(function () {
        zone.style.display = "none";
        document.querySelector(".hint").style.display = "none";
        document.getElementById("done").style.display = "block";
        window.parent.postMessage({
          type: "tool",
          payload: { toolName: "upload_ready", params: { upload_id: "__TOKEN__" } }
        }, "*");
      })
      .catch(function (e) {
        zone.innerHTML = "<b>Drop a .pptx here</b> or click to choose a file";
        fail(e.message || "Upload failed — please try again.");
      });
  }

  zone.onclick = function () { input.click(); };
  zone.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") input.click(); };
  input.onchange = function () { send(input.files[0]); };
  zone.ondragover = function (e) { e.preventDefault(); zone.classList.add("drag"); };
  zone.ondragleave = function () { zone.classList.remove("drag"); };
  zone.ondrop = function (e) {
    e.preventDefault(); zone.classList.remove("drag");
    send(e.dataTransfer.files[0]);
  };
</script>
</body></html>"""
