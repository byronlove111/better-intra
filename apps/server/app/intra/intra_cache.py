"""Redis TTL cache for 42 API responses (rate-limit friendly, shared across workers)."""

from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import BaseModel
from redis import Redis
from redis.exceptions import RedisError

from app.config import settings

logger = logging.getLogger(__name__)

_DEFAULT_TTL_SECONDS = 600.0
_KEY_PREFIX = "betterintra:"
_client: Redis | None = None
_warned = False


def _redis() -> Redis | None:
    global _client, _warned
    url = (settings.redis_url or "").strip()
    if not url:
        return None
    if _client is None:
        _client = Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
    return _client


def _warn(exc: RedisError) -> None:
    global _warned
    if not _warned:
        logger.warning("Redis cache unavailable, skipping (%s)", exc)
        _warned = True


def _namespaced(key: str) -> str:
    return f"{_KEY_PREFIX}{key}"


def _jsonable(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, tuple):
        return [_jsonable(item) for item in value]
    return value


def cache_get(key: str) -> Any | None:
    client = _redis()
    if client is None:
        return None
    try:
        raw = client.get(_namespaced(key))
    except RedisError as exc:
        _warn(exc)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def cache_set(key: str, value: Any, *, ttl_seconds: float = _DEFAULT_TTL_SECONDS) -> None:
    client = _redis()
    if client is None:
        return
    ttl = max(1, int(ttl_seconds))
    try:
        client.setex(_namespaced(key), ttl, json.dumps(_jsonable(value)))
    except RedisError as exc:
        _warn(exc)
    except (TypeError, ValueError) as exc:
        logger.warning("Redis cache encode failed (%s)", exc)


def cache_delete_prefix(prefix: str) -> None:
    client = _redis()
    if client is None:
        return
    pattern = f"{_namespaced(prefix)}*"
    try:
        keys = list(client.scan_iter(match=pattern, count=200))
        if keys:
            client.delete(*keys)
    except RedisError as exc:
        _warn(exc)
