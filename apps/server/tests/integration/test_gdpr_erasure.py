"""Integration — GDPR account erasure (DELETE /users/me)."""

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api_keys.api_key_model import ApiKey
from app.chat import chat_repository
from app.chat.block_model import UserBlock
from app.chat.conversation_model import Conversation
from app.chat.message_model import Message
from app.events.event_model import Event
from app.friends.friend_model import Friendship
from app.intra import intra_person_repository
from app.intra.intra_person_model import IntraPerson
from app.notifications import notification_repository
from app.notifications.notification_schemas import NotificationType
from app.users.user_model import User
from tests.conftest import auth_header


def test_delete_my_account_wipes_all_linked_data(
    client: TestClient,
    db: Session,
    user_a: dict[str, Any],
    user_b: dict[str, Any],
) -> None:
    token_a = user_a["access_token"]
    token_b = user_b["access_token"]
    alice_id = user_a["user"]["id"]
    bob_id = user_b["user"]["id"]
    bob_login = user_b["user"]["login"]

    key = client.post("/api-keys", headers=auth_header(token_a), json={"name": "gdpr"})
    assert key.status_code == 201, key.text

    begin = datetime.now(UTC) + timedelta(days=1)
    event = client.post(
        "/events",
        headers=auth_header(token_a),
        json={
            "title": "To erase",
            "description": "gone",
            "location": "Cluster",
            "begin_at": begin.isoformat(),
            "end_at": (begin + timedelta(hours=1)).isoformat(),
        },
    )
    assert event.status_code == 201, event.text

    notification_repository.create(
        db,
        user_id=alice_id,
        type=NotificationType.announcement.value,
        body="erase me",
        url="/",
    )

    def fake_resolve(db_session: Session, *, viewer: Any, login: str) -> IntraPerson:
        person = intra_person_repository.get_by_login(db_session, login)
        assert person is not None, f"missing intra person for {login}"
        return person

    with patch("app.friends.friend_service.resolve_intra_person", side_effect=fake_resolve):
        follow = client.post(f"/friends/{bob_login}", headers=auth_header(token_a))
        assert follow.status_code == 201, follow.text

    block = client.post(f"/blocks/{bob_login}", headers=auth_header(token_a))
    assert block.status_code == 201, block.text

    conv = chat_repository.get_or_create_conversation(db, alice_id, bob_id)
    chat_repository.create_message(
        db,
        conversation_id=conv.id,
        sender_id=alice_id,
        body="hello from alice",
    )
    chat_repository.create_message(
        db,
        conversation_id=conv.id,
        sender_id=bob_id,
        body="hello from bob",
    )

    assert db.scalar(select(func.count()).select_from(ApiKey).where(ApiKey.user_id == alice_id)) == 1
    assert db.scalar(select(func.count()).select_from(Event).where(Event.creator_id == alice_id)) == 1
    assert db.get(User, alice_id) is not None
    assert db.get(User, alice_id).forty_two_access_token is not None

    erased = client.delete("/users/me", headers=auth_header(token_a))
    assert erased.status_code == 200, erased.text
    body = erased.json()
    assert body["deleted"] is True
    assert body["user"] == 1
    assert body["api_keys"] >= 1
    assert body["events"] >= 1
    assert body["messages"] >= 1
    assert body["conversations"] >= 1

    db.expire_all()
    assert db.get(User, alice_id) is None
    assert db.scalar(select(func.count()).select_from(ApiKey).where(ApiKey.user_id == alice_id)) == 0
    assert db.scalar(select(func.count()).select_from(Event).where(Event.creator_id == alice_id)) == 0
    assert (
        db.scalar(select(func.count()).select_from(Friendship).where(Friendship.follower_id == alice_id))
        == 0
    )
    assert (
        db.scalar(
            select(func.count())
            .select_from(UserBlock)
            .where((UserBlock.blocker_id == alice_id) | (UserBlock.blocked_id == alice_id))
        )
        == 0
    )
    assert (
        db.scalar(
            select(func.count())
            .select_from(Conversation)
            .where((Conversation.user_low_id == alice_id) | (Conversation.user_high_id == alice_id))
        )
        == 0
    )
    assert db.scalar(select(func.count()).select_from(Message).where(Message.sender_id == alice_id)) == 0

    person = db.get(IntraPerson, 1001)
    assert person is not None
    assert person.login == "alice"
    assert person.betterintra_user_id is None

    # Peer account remains in DB (calling /users/me would hit live Intra — out of scope here)
    assert db.get(User, bob_id) is not None
    assert db.scalar(select(func.count()).select_from(User)) == 1

    # Former JWT no longer authenticates
    gone = client.get("/users/me", headers=auth_header(token_a))
    assert gone.status_code == 401
    assert gone.json()["detail"] == "Could not validate credentials"
