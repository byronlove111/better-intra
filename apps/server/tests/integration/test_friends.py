"""Integration — friends follows (Intra API mocked)."""

from typing import Any
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.intra import intra_person_repository
from app.intra.intra_person_model import IntraPerson
from tests.conftest import auth_header


def test_follow_unfollow_and_self_forbidden(
    client: TestClient,
    db: Session,
    user_a: dict[str, Any],
    user_b: dict[str, Any],
) -> None:
    token_a = user_a["access_token"]
    bob_login = user_b["user"]["login"]

    def fake_resolve(db_session: Session, *, viewer: Any, login: str) -> IntraPerson:
        person = intra_person_repository.get_by_login(db_session, login)
        assert person is not None, f"missing intra person for {login}"
        return person

    with patch("app.friends.friend_service.resolve_intra_person", side_effect=fake_resolve):
        # Self-follow
        self_resp = client.post("/friends/alice", headers=auth_header(token_a))
        assert self_resp.status_code == 400

        follow = client.post(f"/friends/{bob_login}", headers=auth_header(token_a))
        assert follow.status_code == 201, follow.text
        assert follow.json()["login"] == bob_login
        assert follow.json()["is_betterintra_linked"] is True

        again = client.post(f"/friends/{bob_login}", headers=auth_header(token_a))
        assert again.status_code == 409

        following = client.get("/friends/following", headers=auth_header(token_a))
        assert following.status_code == 200
        assert any(f["login"] == bob_login for f in following.json()["items"])

        stats = client.get("/friends/stats", headers=auth_header(token_a))
        assert stats.status_code == 200
        assert stats.json()["following_count"] >= 1

        unfollow = client.delete(f"/friends/{bob_login}", headers=auth_header(token_a))
        assert unfollow.status_code == 204

        following_after = client.get("/friends/following", headers=auth_header(token_a))
        assert all(f["login"] != bob_login for f in following_after.json()["items"])


def test_friends_require_intra_linked(client: TestClient, user_unlinked: dict[str, Any]) -> None:
    token = user_unlinked["access_token"]
    response = client.get("/friends/following", headers=auth_header(token))
    assert response.status_code == 403
    assert "Intra" in response.json()["detail"]
