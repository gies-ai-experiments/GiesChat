"""Path sandbox for the vendored PowerPoint MCP server.

Every model-supplied file path is reduced to its basename and forced under a
per-user directory, so save/open/template operations cannot touch anything
outside that user's sandbox. The Gies template is the single read-only
exception, allowed only when the caller passes allow_template=True.
"""
import hashlib
import os
from pathlib import Path

SANDBOX_ROOT = Path(os.environ.get("PPTX_SANDBOX_ROOT", "/tmp/decks"))
TEMPLATE_PATH = os.environ.get("GIES_TEMPLATE_PATH", "/app/templates/gies.pptx")


def user_root(user: str) -> Path:
    digest = hashlib.sha1(user.encode("utf-8")).hexdigest()
    root = SANDBOX_ROOT / digest
    root.mkdir(parents=True, exist_ok=True)
    return root


def _is_template(path: str) -> bool:
    try:
        return os.path.realpath(path) == os.path.realpath(TEMPLATE_PATH)
    except OSError:
        return False


def resolve(path: str, user: str, *, allow_template: bool = False) -> str:
    if allow_template and _is_template(path):
        return TEMPLATE_PATH
    root = user_root(user).resolve()
    target = (root / os.path.basename(path)).resolve()
    if os.path.commonpath([str(target), str(root)]) != str(root):
        raise ValueError(f"Path escapes sandbox: {path!r}")
    return str(target)
