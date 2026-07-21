"""Gies entrypoint: assemble the vendored MCP server behind auth + downloads.

Importing ppt_mcp_server runs upstream's module-level tool registration against
the per-user scoped state (wired in ppt_mcp_server.py), so `app` arrives fully
configured. We take its streamable-http ASGI app, mount the /download route,
wrap the whole thing in the shared-secret auth middleware, and serve it with
uvicorn. The MCP endpoint is served at /mcp (FastMCP default).
"""
import os

import uvicorn
from starlette.routing import Route

from ppt_mcp_server import app
from gies_auth import AuthMiddleware
from gies_downloads import download

_PORT = int(os.environ.get("PORT", "8000"))
app.settings.host = "0.0.0.0"
app.settings.port = _PORT

assert hasattr(app, "streamable_http_app"), "mcp version lacks streamable_http_app()"
_starlette = app.streamable_http_app()
_starlette.router.routes.append(Route("/download/{token}", download, methods=["GET"]))

asgi = AuthMiddleware(_starlette)

if __name__ == "__main__":
    uvicorn.run(asgi, host="0.0.0.0", port=_PORT)
