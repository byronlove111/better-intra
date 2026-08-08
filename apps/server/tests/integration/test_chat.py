"""Integration — chat DM, block, last-read, one thread per pair."""

from typing import Any

from fastapi.testclient import TestClient

from tests.conftest import auth_header


def test_dm_block_and_single_thread(
    client: TestClient,
    user_a: dict[str, Any],
    user_b: dict[str, Any],
) -> None:
    token_a = user_a["access_token"]
    token_b = user_b["access_token"]

    msg1 = client.post(
        "/messages",
        headers=auth_header(token_a),
        json={"to_login": "bob", "body": "hey bob"},
    )
    assert msg1.status_code == 201, msg1.text
    conversation_id = msg1.json()["conversation_id"]

    msg2 = client.post(
        "/messages",
        headers=auth_header(token_b),
        json={"to_login": "alice", "body": "hey alice"},
    )
    assert msg2.status_code == 201, msg2.text
    assert msg2.json()["conversation_id"] == conversation_id

    conversations = client.get("/conversations", headers=auth_header(token_a))
    assert conversations.status_code == 200
    assert len(conversations.json()) == 1

    messages = client.get(
        f"/conversations/{conversation_id}/messages",
        headers=auth_header(token_a),
    )
    assert messages.status_code == 200
    assert len(messages.json()["items"]) == 2

    read = client.post(
        f"/conversations/{conversation_id}/read",
        headers=auth_header(token_a),
        json={},
    )
    assert read.status_code == 200
    assert read.json()["last_read_message_id"] == msg2.json()["id"]

    # Block alice → bob cannot message
    blocked = client.post("/blocks/bob", headers=auth_header(token_a))
    assert blocked.status_code == 201, blocked.text

    denied = client.post(
        "/messages",
        headers=auth_header(token_b),
        json={"to_login": "alice", "body": "still there?"},
    )
    assert denied.status_code == 403

    unblocked = client.delete("/blocks/bob", headers=auth_header(token_a))
    assert unblocked.status_code == 204

    allowed = client.post(
        "/messages",
        headers=auth_header(token_b),
        json={"to_login": "alice", "body": "back"},
    )
    assert allowed.status_code == 201
    assert allowed.json()["conversation_id"] == conversation_id


def test_cannot_message_self(client: TestClient, user_a: dict[str, Any]) -> None:
    response = client.post(
        "/messages",
        headers=auth_header(user_a["access_token"]),
        json={"to_login": "alice", "body": "hi me"},
    )
    assert response.status_code == 400


def test_chat_requires_intra(client: TestClient, user_unlinked: dict[str, Any]) -> None:
    response = client.get("/conversations", headers=auth_header(user_unlinked["access_token"]))
    assert response.status_code == 403
