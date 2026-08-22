"""Pytest fixtures — real Postgres test DB, no live Intra API."""

from __future__ import annotations

import os
from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from typing import Any

# Must run before importing app.* (engine/settings are created at import time).
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra_test",
)
os.environ["JWT_SECRET"] = "test-only-jwt-secret-do-not-use-in-prod"
os.environ["ENVIRONMENT"] = "test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api_keys.api_key_model import ApiKey  # noqa: F401
from app.api_keys.rate_limit import _hits
from app.chat.block_model import UserBlock  # noqa: F401
from app.chat.conversation_model import Conversation  # noqa: F401
from app.chat.conversation_read_model import ConversationRead  # noqa: F401
from app.chat.message_model import Message  # noqa: F401
from app.db import Base, SessionLocal, engine
from app.deps import get_db
from app.events.event_model import Event  # noqa: F401
from app.friends.friend_model import Friendship  # noqa: F401
from app.intra.intra_person_model import IntraPerson  # noqa: F401
from app.main import app
from app.notifications.notification_model import Notification  # noqa: F401
from app.users import user_repository
from app.users.user_model import User  # noqa: F401


@pytest.fixture(scope="session", autouse=True)
def prepare_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_db() -> Generator[None, None, None]:
    """Truncate all tables between tests; reset in-memory rate limiter."""
    _hits.clear()
    yield
    with engine.begin() as conn:
        tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        if tables:
            conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    _hits.clear()


@pytest.fixture
def db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    def _override_get_db() -> Generator[Session, None, None]:
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register_user(client: TestClient, *, email: str, password: str = "password123") -> dict[str, Any]:
    response = client.post("/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201, response.text
    return response.json()


def link_intra(
    db: Session,
    *,
    user_id: int,
    forty_two_id: int,
    login: str,
    display_name: str | None = None,
) -> User:
    user = user_repository.get_by_id(db, user_id)
    assert user is not None
    return user_repository.link_forty_two(
        db,
        user,
        forty_two_id=forty_two_id,
        login=login,
        display_name=display_name or login,
        avatar_url=None,
        access_token="test-access-token",
        refresh_token="test-refresh-token",
        token_expires_at=datetime.now(UTC) + timedelta(hours=1),
    )


@pytest.fixture
def user_a(client: TestClient, db: Session) -> dict[str, Any]:
    payload = register_user(client, email="alice@example.com")
    user = link_intra(db, user_id=payload["user"]["id"], forty_two_id=1001, login="alice")
    payload["user"] = {
        **payload["user"],
        "id": user.id,
        "login": user.login,
        "forty_two_id": user.forty_two_id,
        "is_intra_linked": True,
    }
    return payload


@pytest.fixture
def user_b(client: TestClient, db: Session) -> dict[str, Any]:
    payload = register_user(client, email="bob@example.com")
    user = link_intra(db, user_id=payload["user"]["id"], forty_two_id=1002, login="bob")
    payload["user"] = {
        **payload["user"],
        "id": user.id,
        "login": user.login,
        "forty_two_id": user.forty_two_id,
        "is_intra_linked": True,
    }
    return payload


@pytest.fixture
def user_unlinked(client: TestClient) -> dict[str, Any]:
    return register_user(client, email="carol@example.com")
