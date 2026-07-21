"""Per-user isolation for the vendored server's global presentation state.

Upstream keeps `presentations = {}` plus a single `current_presentation_id`
shared across all requests, and generates sequential, guessable ids
(`presentation_1`, ...). On a shared HTTP worker that lets one user read or
overwrite another's deck. ScopedPresentations is a drop-in MutableMapping that
routes every read/write to a per-user backing dict keyed by the request's
authenticated user, so no tool code changes and one user can never address
another's deck. Storing a presentation also marks it current for that user.
Idle presentations evict after TTL_SECONDS to bound memory.
"""
import os
import time
from collections.abc import MutableMapping
from typing import Dict

from gies_auth import current_user

TTL_SECONDS = int(os.environ.get("PPTX_STATE_TTL", str(2 * 60 * 60)))

_store: Dict[str, Dict[str, object]] = {}
_touched: Dict[str, float] = {}       # "user\x00id" -> last access (monotonic)
_current: Dict[str, str] = {}         # user -> current presentation id


def _now() -> float:
    return time.monotonic()


def _key(user: str, pid: str) -> str:
    return f"{user}\x00{pid}"


def _sweep() -> None:
    cutoff = _now() - TTL_SECONDS
    for key, ts in list(_touched.items()):
        if ts <= cutoff:
            user, _, pid = key.partition("\x00")
            _store.get(user, {}).pop(pid, None)
            _touched.pop(key, None)
            if _current.get(user) == pid:
                _current.pop(user, None)


class ScopedPresentations(MutableMapping):
    def _bucket(self) -> Dict[str, object]:
        return _store.setdefault(current_user(), {})

    def __getitem__(self, key):
        value = self._bucket()[key]
        _touched[_key(current_user(), key)] = _now()
        return value

    def __setitem__(self, key, value):
        _sweep()
        user = current_user()
        self._bucket()[key] = value
        _touched[_key(user, key)] = _now()
        _current[user] = key

    def __delitem__(self, key):
        user = current_user()
        del self._bucket()[key]
        _touched.pop(_key(user, key), None)
        if _current.get(user) == key:
            _current.pop(user, None)

    def __iter__(self):
        return iter(self._bucket())

    def __len__(self):
        return len(self._bucket())


def get_current_presentation_id():
    return _current.get(current_user())


def set_current_presentation_id(pres_id):
    _current[current_user()] = pres_id
