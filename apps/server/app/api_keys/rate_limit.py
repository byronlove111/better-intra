"""Simple in-memory sliding-window rate limiter (per API key id)."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, status

from app.config import settings

_lock = Lock()
_hits: dict[int, deque[float]] = defaultdict(deque)


def check_rate_limit(api_key_id: int) -> None:
    limit = settings.api_key_rate_limit_per_minute
    window = 60.0
    now = time.monotonic()
    with _lock:
        q = _hits[api_key_id]
        while q and now - q[0] >= window:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded ({limit} requests/minute)",
                headers={"Retry-After": "60"},
            )
        q.append(now)
