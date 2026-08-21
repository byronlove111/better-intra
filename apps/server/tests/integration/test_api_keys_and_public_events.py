"""Integration — API keys + public /api/v1/events CRUD + rate limit."""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from tests.conftest import auth_header


def _event_payload(**overrides: Any) -> dict[str, Any]:
    begin = datetime.now(UTC) + timedelta(days=1)
    end = begin + timedelta(hours=2)
    data = {
        "title": "Public API Meetup",
        "description": "desc",
        "location": "Cluster",
        "begin_at": begin.isoformat(),
        "end_at": end.isoformat(),
    }
    data.update(overrides)
    return data


def _create_api_key(client: TestClient, token: str, name: str = "ci") -> dict[str, Any]:
    response = client.post("/api-keys", headers=auth_header(token), json={"name": name})
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["key"].startswith("bi_")
    return body


def test_api_key_lifecycle_and_public_events_crud(
    client: TestClient,
    user_a: dict[str, Any],
    user_b: dict[str, Any],
) -> None:
    token_a = user_a["access_token"]
    token_b = user_b["access_token"]

    created_key = _create_api_key(client, token_a, name="prod")
    raw_key = created_key["key"]
    key_id = created_key["id"]

    listed = client.get("/api-keys", headers=auth_header(token_a))
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert "key" not in listed.json()[0]

    # Missing key
    assert client.get("/api/v1/events").status_code == 401

    # Invalid key
    bad = client.get("/api/v1/events", headers={"X-API-Key": "bi_not-a-real-key"})
    assert bad.status_code == 401

    # Create event via public API
    created = client.post(
        "/api/v1/events",
        headers={"X-API-Key": raw_key},
        json=_event_payload(),
    )
    assert created.status_code == 201, created.text
    event_id = created.json()["id"]
    assert created.json()["creator_id"] == user_a["user"]["id"]

    listed_events = client.get("/api/v1/events", headers={"X-API-Key": raw_key})
    assert listed_events.status_code == 200
    assert any(e["id"] == event_id for e in listed_events.json())

    got = client.get(f"/api/v1/events/{event_id}", headers={"X-API-Key": raw_key})
    assert got.status_code == 200
    assert got.json()["title"] == "Public API Meetup"

    updated = client.put(
        f"/api/v1/events/{event_id}",
        headers={"X-API-Key": raw_key},
        json=_event_payload(title="Updated Meetup"),
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Updated Meetup"

    # Other user's key cannot mutate or read owner-scoped resources
    other_key = _create_api_key(client, token_b, name="bob-key")["key"]
    forbidden = client.put(
        f"/api/v1/events/{event_id}",
        headers={"X-API-Key": other_key},
        json=_event_payload(title="Hijack"),
    )
    assert forbidden.status_code == 403

    other_list = client.get("/api/v1/events", headers={"X-API-Key": other_key})
    assert other_list.status_code == 200
    assert all(e["id"] != event_id for e in other_list.json())

    other_get = client.get(
        f"/api/v1/events/{event_id}",
        headers={"X-API-Key": other_key},
    )
    assert other_get.status_code == 404

    deleted = client.delete(f"/api/v1/events/{event_id}", headers={"X-API-Key": raw_key})
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/events/{event_id}", headers={"X-API-Key": raw_key}).status_code == 404

    revoked = client.delete(f"/api-keys/{key_id}", headers=auth_header(token_a))
    assert revoked.status_code == 200
    assert client.get("/api/v1/events", headers={"X-API-Key": raw_key}).status_code == 401

    again = client.delete(f"/api-keys/{key_id}", headers=auth_header(token_a))
    assert again.status_code == 409


def test_public_event_rejects_bad_dates(client: TestClient, user_a: dict[str, Any]) -> None:
    raw_key = _create_api_key(client, user_a["access_token"])["key"]
    begin = datetime.now(UTC) + timedelta(days=1)
    response = client.post(
        "/api/v1/events",
        headers={"X-API-Key": raw_key},
        json=_event_payload(begin_at=begin.isoformat(), end_at=begin.isoformat()),
    )
    assert response.status_code == 422


def test_public_event_rejects_unsafe_url(client: TestClient, user_a: dict[str, Any]) -> None:
    raw_key = _create_api_key(client, user_a["access_token"])["key"]
    response = client.post(
        "/api/v1/events",
        headers={"X-API-Key": raw_key},
        json=_event_payload(url="javascript:alert(1)"),
    )
    assert response.status_code == 422


def test_api_key_rate_limit(
    client: TestClient,
    user_a: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "api_key_rate_limit_per_minute", 3)
    raw_key = _create_api_key(client, user_a["access_token"])["key"]
    headers = {"X-API-Key": raw_key}

    statuses = [client.get("/api/v1/events", headers=headers).status_code for _ in range(4)]
    assert statuses[:3] == [200, 200, 200]
    assert statuses[3] == 429
