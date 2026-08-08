"""Integration — notifications inbox + 7-day TTL purge."""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.notifications import notification_repository
from app.notifications.notification_schemas import NotificationType
from tests.conftest import auth_header


def test_list_notifications_and_purge_expired(
    client: TestClient,
    db: Session,
    user_a: dict[str, Any],
) -> None:
    user_id = user_a["user"]["id"]

    fresh = notification_repository.create(
        db,
        user_id=user_id,
        type=NotificationType.announcement.value,
        body="fresh notif",
        url="/",
    )
    stale = notification_repository.create(
        db,
        user_id=user_id,
        type=NotificationType.dm.value,
        body="old notif",
        url="/conversations/1",
    )
    # Force created_at older than TTL
    stale.created_at = datetime.now(UTC) - timedelta(days=8)
    db.add(stale)
    db.commit()

    response = client.get("/notifications", headers=auth_header(user_a["access_token"]))
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    bodies = {n["body"] for n in items}
    assert "fresh notif" in bodies
    assert "old notif" not in bodies
    assert fresh.id in {n["id"] for n in items}


def test_notifications_require_intra(client: TestClient, user_unlinked: dict[str, Any]) -> None:
    response = client.get("/notifications", headers=auth_header(user_unlinked["access_token"]))
    assert response.status_code == 403
