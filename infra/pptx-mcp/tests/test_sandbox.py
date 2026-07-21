import os
import pytest
import gies_sandbox as sb


@pytest.fixture(autouse=True)
def _tmp_root(tmp_path, monkeypatch):
    monkeypatch.setattr(sb, "SANDBOX_ROOT", tmp_path / "decks")
    monkeypatch.setattr(sb, "TEMPLATE_PATH", str(tmp_path / "tpl" / "gies.pptx"))
    os.makedirs(tmp_path / "tpl", exist_ok=True)
    open(sb.TEMPLATE_PATH, "wb").close()


def test_plain_name_lands_in_user_root():
    out = sb.resolve("deck.pptx", "alice")
    assert out == str((sb.user_root("alice") / "deck.pptx").resolve())


@pytest.mark.parametrize("evil", [
    "../../etc/passwd", "/etc/shadow", "../secret.pptx",
    "..%2f..%2fetc", "a/b/c/deck.pptx",
])
def test_traversal_reduces_to_basename_in_root(evil):
    out = sb.resolve(evil, "alice")
    root = str(sb.user_root("alice").resolve())
    assert os.path.commonpath([out, root]) == root


def test_two_users_get_distinct_roots():
    assert sb.resolve("d.pptx", "alice") != sb.resolve("d.pptx", "bob")


def test_template_allowed_only_with_flag():
    assert sb.resolve(sb.TEMPLATE_PATH, "alice", allow_template=True) == sb.TEMPLATE_PATH
    # without the flag the template path is treated as any other path (basename'd)
    assert sb.resolve(sb.TEMPLATE_PATH, "alice") != sb.TEMPLATE_PATH
