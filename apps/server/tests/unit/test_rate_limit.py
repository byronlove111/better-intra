"""Unit tests — in-memory API key rate limiter."""

import time

import pytest
from fastapi import HTTPException

from app.api_keys import rate_limit
from app.config import settings


@pytest.fixture(autouse=True)
def reset_limiter(monkeypatch: pytest.MonkeyPatch) -> None:
    rate_limit._hits.clear()
    monkeypatch.setattr(type(settings), "api_key_rate_limit_per_minute", 3)
    yield
    rate_limit._hits.clear()


def test_allows_under_limit() -> None:
    for _ in range(3):
        rate_limit.check_rate_limit(1)


def test_blocks_over_limit() -> None:
    for _ in range(3):
        rate_limit.check_rate_limit(1)
    with pytest.raises(HTTPException) as exc:
        rate_limit.check_rate_limit(1)
    assert exc.value.status_code == 429
    assert exc.value.headers is not None
    assert exc.value.headers.get("Retry-After") == "60"


def test_keys_are_isolated() -> None:
    for _ in range(3):
        rate_limit.check_rate_limit(10)
    # Different key id still allowed
    rate_limit.check_rate_limit(11)


def test_window_expires(monkeypatch: pytest.MonkeyPatch) -> None:
    times = iter([100.0, 100.1, 100.2, 100.3, 161.0])

    def fake_monotonic() -> float:
        return next(times)

    monkeypatch.setattr(time, "monotonic", fake_monotonic)
    for _ in range(3):
        rate_limit.check_rate_limit(2)
    with pytest.raises(HTTPException):
        rate_limit.check_rate_limit(2)
    # After window (>60s), allowed again
    rate_limit.check_rate_limit(2)
