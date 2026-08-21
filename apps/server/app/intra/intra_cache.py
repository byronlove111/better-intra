"""Short-lived in-memory cache for 42 API responses (rate-limit friendly)."""

from __future__ import annotations

import time
from typing import Any

_DEFAULT_TTL_SECONDS = 600.0  # 10 minutes
_CACHE: dict[str, tuple[float, Any]] = {}


def cache_get(key: str) -> Any | None:
    entry = _CACHE.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if time.monotonic() >= expires_at:
        _CACHE.pop(key, None)
        return None
    return value


def cache_set(key: str, value: Any, *, ttl_seconds: float = _DEFAULT_TTL_SECONDS) -> None:
    _CACHE[key] = (time.monotonic() + ttl_seconds, value)


def cache_delete_prefix(prefix: str) -> None:
    for key in list(_CACHE):
        if key.startswith(prefix):
            _CACHE.pop(key, None)
