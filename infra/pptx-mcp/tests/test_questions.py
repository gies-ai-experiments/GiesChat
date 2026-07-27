import pytest

import gies_auth
import gies_questions as gq


@pytest.fixture(autouse=True)
def _reset():
    gq._pending.clear()
    gq._answered.clear()
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


def test_gate_opens_on_answers():
    assert not gq.has_unlock("alice")
    result = _present_and_submit()
    assert "error" not in result
    assert "Classmates" in result["message"]
    assert gq.has_unlock("alice")


def test_gate_survives_repeat_creates():
    """A build that crashes after create_presentation must be retryable.

    The gate used to be a one-shot counter, so a failed turn burned the unlock
    and the user was asked to answer the same card again.
    """
    _present_and_submit()
    assert gq.has_unlock("alice")
    assert gq.has_unlock("alice")                 # still open for the retry


def test_new_card_closes_the_gate():
    _present_and_submit()
    assert gq.has_unlock("alice")
    gq.present(QUESTIONS)                        # a new deck needs new answers
    assert not gq.has_unlock("alice")
    assert gq.recorded_answers("alice") == []


def test_answers_are_replayed_to_the_model():
    """The card posts answers to the server, so the model only sees them if
    `create_presentation*` hands them back."""
    _present_and_submit(answer="Executives")
    answers = gq.recorded_answers("alice")
    assert [a["answer"] for a in answers] == ["Executives"]
    assert gq.recorded_answers("bob") == []


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
