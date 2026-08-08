"""Integration — JWT /events CRUD + BetterIntra-only agenda feed."""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient

from tests.conftest import auth_header


def _payload(title: str = "Hackathon") -> dict[str, Any]:
    begin = datetime.now(UTC) + timedelta(days=2)
    end = begin + timedelta(hours=3)
    return {
        "title": title,
        "description": "BI event",
        "location": "Bocal",
        "begin_at": begin.isoformat(),
        "end_at": end.isoformat(),
    }


def test_jwt_events_crud_and_owner_guard(
    client: TestClient,
    user_a: dict[str, Any],
    user_b: dict[str, Any],
) -> None:
    token_a = user_a["access_token"]
    token_b = user_b["access_token"]

    created = client.post("/events", headers=auth_header(token_a), json=_payload())
    assert created.status_code == 201, created.text
    event_id = created.json()["id"]

    feed = client.get(
        "/events",
        headers=auth_header(token_a),
        params={"sources": "betterintra"},
    )
    assert feed.status_code == 200, feed.text
    body = feed.json()
    assert body["sources_included"] == ["betterintra"]
    assert any(item["id"] == f"betterintra:{event_id}" for item in body["items"])

    got = client.get(f"/events/{event_id}", headers=auth_header(token_a))
    assert got.status_code == 200
    assert got.json()["title"] == "Hackathon"

    patched = client.patch(
        f"/events/{event_id}",
        headers=auth_header(token_a),
        json={"title": "Hackathon v2"},
    )
    assert patched.status_code == 200
    assert patched.json()["title"] == "Hackathon v2"

    forbidden = client.patch(
        f"/events/{event_id}",
        headers=auth_header(token_b),
        json={"title": "Nope"},
    )
    assert forbidden.status_code == 403

    forbidden_del = client.delete(f"/events/{event_id}", headers=auth_header(token_b))
    assert forbidden_del.status_code == 403

    deleted = client.delete(f"/events/{event_id}", headers=auth_header(token_a))
    assert deleted.status_code == 204
    assert client.get(f"/events/{event_id}", headers=auth_header(token_a)).status_code == 404


def test_events_require_auth(client: TestClient) -> None:
    assert client.get("/events").status_code == 401
    assert client.post("/events", json=_payload()).status_code == 401
