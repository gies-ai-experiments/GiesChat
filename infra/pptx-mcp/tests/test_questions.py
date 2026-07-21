import pytest

import gies_auth
import gies_questions as gq


@pytest.fixture(autouse=True)
def _reset():
    gq._pending.clear()
    gq._unlocked.clear()
    gies_auth._user.set("alice")
    yield


QUESTIONS = [
    {"question": "What narrative arc?", "options": ["How → Why → What", "Problem → Solution → Demo"]},
    {"question": "Who is the audience?", "options": ["Classmates", "Faculty", "Recruiters"]},
]


def _present_and_submit(answer="Classmates"):
    set_id = gq.present(QUESTIONS)["set_id"]
    return gq.submit(set_id, [
        {"question": "What narrative arc?", "skipped": True},
        {"question": "Who is the audience?", "answer": answer},
    ])


def test_gate_flow_unlocks_once():
    assert not gq.has_unlock("alice")
    result = _present_and_submit()
    assert "error" not in result
    assert "Classmates" in result["message"]
    assert gq.has_unlock("alice")
    gq.consume_unlock("alice")
    assert not gq.has_unlock("alice")            # one create per submission


def test_all_skipped_rejected():
    set_id = gq.present(QUESTIONS)["set_id"]
    result = gq.submit(set_id, [{"question": "q", "skipped": True}])
    assert "skipped every question" in result["error"]
    assert not gq.has_unlock("alice")


def test_unknown_set_id_rejected():
    gq.present(QUESTIONS)
    result = gq.submit("wrong-id", [{"question": "q", "answer": "a"}])
    assert "Unknown or expired" in result["error"]


def test_cross_user_isolation():
    set_id = gq.present(QUESTIONS)["set_id"]
    gies_auth._user.set("bob")
    assert "error" in gq.submit(set_id, [{"question": "q", "answer": "a"}])
    gies_auth._user.set("alice")
    assert "error" not in gq.submit(set_id, [{"question": "q", "answer": "a"}])
    assert gq.has_unlock("alice") and not gq.has_unlock("bob")


def test_pending_expires(monkeypatch):
    monkeypatch.setattr(gq, "QUESTIONS_TTL_SECONDS", -1)
    set_id = gq.present(QUESTIONS)["set_id"]
    result = gq.submit(set_id, [{"question": "q", "answer": "a"}])
    assert "Unknown or expired" in result["error"]


def test_validation():
    assert "error" in gq.present([])
    assert "error" in gq.present([{"question": "q", "options": ["only one"]}])
    assert "error" in gq.present([{"question": "", "options": ["a", "b"]}])


def test_card_html_escapes_and_posts():
    evil = [{"question": "<script>alert(1)</script>?", "options": ["a</script>", "b"]}]
    set_id = gq.present(evil)["set_id"]
    card = gq.render_card(set_id, evil)
    assert "<script>alert(1)</script>" not in card
    assert "&lt;script&gt;" in card
    assert "submit_deck_answers" in card
    assert set_id in card
    assert '"type": "tool"' in card or "type: \"tool\"" in card
