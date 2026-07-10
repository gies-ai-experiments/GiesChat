#!/usr/bin/env python3
"""Show application screenshots side-by-side with Approve / Deny buttons.

Usage:
    generate_visual_before_after.py --pair BEFORE AFTER LABEL [--pair BEFORE AFTER LABEL ...]
    generate_visual_before_after.py --static --out PATH --pair BEFORE AFTER LABEL [...]

The caller is responsible for capturing screenshots before and after the change.
This script only renders those screenshots in a review page and waits for the
user's decision.
"""
from __future__ import annotations

import argparse
import base64
import html
import mimetypes
import os
import sys
import tempfile
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer


def data_uri(path: str) -> str:
    mime = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("ascii")
    return "data:%s;base64,%s" % (mime, encoded)


def build_page(pairs: list[list[str]], with_buttons: bool) -> str:
    if not pairs:
        sys.exit("At least one --pair BEFORE AFTER LABEL is required")

    sections = []
    for before, after, label in pairs:
        if not os.path.isfile(before):
            sys.exit("Missing before screenshot: %s" % before)
        if not os.path.isfile(after):
            sys.exit("Missing after screenshot: %s" % after)
        sections.append(
            """
<section class="pair">
  <h2>{label}</h2>
  <div class="grid">
    <figure><figcaption>Before</figcaption><img src="{before}" alt="Before: {label}"></figure>
    <figure><figcaption>After</figcaption><img src="{after}" alt="After: {label}"></figure>
  </div>
</section>
""".format(
                label=html.escape(label),
                before=data_uri(before),
                after=data_uri(after),
            )
        )

    buttons = ""
    if with_buttons:
        buttons = """
<div id="bar">
  <span>Does the application change look right?</span>
  <button class="ok" onclick="send('approve')">Approve</button>
  <button class="no" onclick="send('deny')">Deny</button>
</div>
<script>
function send(d) {
  fetch('/decision', {method: 'POST', body: d}).then(function () {
    document.body.innerHTML = '<h1>' + (d === 'approve' ? 'Approved' : 'Denied') +
      '</h1><p>Back to your Claude session &mdash; you can close this tab.</p>';
  });
}
</script>"""

    return """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Application Before / After</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; margin-bottom: 6rem; background: #f6f7f9; color: #111; }}
h1 {{ margin-bottom: .25rem; }}
.pair {{ margin-top: 2rem; }}
.grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; align-items: start; }}
figure {{ margin: 0; background: #fff; border: 1px solid #d0d7de; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.06); }}
figcaption {{ padding: .75rem 1rem; font-weight: 700; border-bottom: 1px solid #d0d7de; background: #fff; }}
img {{ display: block; width: 100%; height: auto; }}
#bar {{ position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ccc; padding: 1rem 2rem; display: flex; gap: 1rem; align-items: center; z-index: 10; }}
#bar button {{ font-size: 15px; padding: .5rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; color: #fff; }}
#bar .ok {{ background: #2da44e; }}
#bar .no {{ background: #cf222e; }}
@media (max-width: 900px) {{ .grid {{ grid-template-columns: 1fr; }} }}
</style></head><body>
<h1>Application Before / After</h1>
<p>Review the actual app screenshots, not the code diff.</p>
{body}
{buttons}
</body></html>""".format(body="\n".join(sections), buttons=buttons)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pair", action="append", nargs=3, metavar=("BEFORE", "AFTER", "LABEL"))
    ap.add_argument("--static", action="store_true", help="write the page only, no server")
    ap.add_argument("--out", default=None)
    ap.add_argument("--no-open", action="store_true")
    ap.add_argument("--timeout", type=int, default=570)
    ap.add_argument("--port", type=int, default=0)
    args = ap.parse_args()

    page = build_page(args.pair or [], with_buttons=not args.static)

    if args.static:
        out = args.out or os.path.join(tempfile.gettempdir(), "app-before-after.html")
        with open(out, "w", encoding="utf-8") as f:
            f.write(page)
        print(out)
        if not args.no_open:
            webbrowser.open("file://" + os.path.abspath(out))
        return

    decision = {"value": None}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            body = page.encode("utf-8") if self.path == "/" else b"not found"
            self.send_response(200 if self.path == "/" else 404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            n = int(self.headers.get("Content-Length", 0))
            verdict = self.rfile.read(n).decode("utf-8", "replace").strip()
            if self.path == "/decision" and verdict in ("approve", "deny"):
                decision["value"] = verdict
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")

        def log_message(self, *a):
            pass

    server = HTTPServer(("127.0.0.1", args.port), Handler)
    server.timeout = 1
    url = "http://127.0.0.1:%d/" % server.server_address[1]
    print("Review at %s - waiting for Approve/Deny (timeout %ss)" % (url, args.timeout), flush=True)
    if not args.no_open:
        webbrowser.open(url)

    deadline = time.time() + args.timeout
    while decision["value"] is None and time.time() < deadline:
        server.handle_request()
    server.server_close()

    if decision["value"] == "approve":
        print("APPROVED")
        sys.exit(0)
    if decision["value"] == "deny":
        print("DENIED")
        sys.exit(1)
    print("TIMEOUT")
    sys.exit(2)


if __name__ == "__main__":
    main()
