import pytest
import gies_auth
import gies_state
from gies_state import ScopedPresentations, get_current_presentation_id


@pytest.fixture(autouse=True)
def _reset():
    gies_state._store.clear()
    gies_state._touched.clear()
    gies_state._current.clear()
    yield


def _as(user):
    return gies_auth._user.set(user)


def test_users_have_independent_buckets():
    p = ScopedPresentations()
    _as("alice"); p["presentation_1"] = "A-DECK"
    _as("bob")
    assert len(p) == 0
    assert "presentation_1" not in p
    with pytest.raises(KeyError):
        _ = p["presentation_1"]


def test_same_id_routes_to_different_decks():
    p = ScopedPresentations()
    _as("alice"); p["presentation_1"] = "A-DECK"
    _as("bob"); p["presentation_1"] = "B-DECK"
    _as("alice"); assert p["presentation_1"] == "A-DECK"
    _as("bob"); assert p["presentation_1"] == "B-DECK"


def test_storing_sets_current_for_that_user():
    p = ScopedPresentations()
    _as("alice"); p["presentation_1"] = "A-DECK"
    assert get_current_presentation_id() == "presentation_1"
    _as("bob"); assert get_current_presentation_id() is None


def test_idle_decks_evicted_on_next_store(monkeypatch):
    monkeypatch.setattr(gies_state, "TTL_SECONDS", 0)
    p = ScopedPresentations()
    _as("alice")
    p["presentation_1"] = "OLD"
    p["presentation_2"] = "NEW"        # store triggers a sweep; TTL 0 evicts the first
    assert "presentation_1" not in p
    assert "presentation_2" in p
