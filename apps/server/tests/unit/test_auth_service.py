"""Unit tests — pure auth/JWT helpers (no HTTP, no DB)."""

import jwt
import pytest

from app.auth import auth_service
from app.config import settings


def test_hash_and_verify_password() -> None:
    hashed = auth_service.hash_password("password123")
    assert hashed != "password123"
    assert auth_service.verify_password("password123", hashed) is True
    assert auth_service.verify_password("wrong", hashed) is False


def test_access_token_roundtrip() -> None:
    token = auth_service.create_access_token(42)
    payload = auth_service.decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["type"] == "access"


def test_refresh_token_rejected_as_access() -> None:
    token = auth_service.create_refresh_token(7)
    with pytest.raises(jwt.InvalidTokenError):
        auth_service.decode_access_token(token)


def test_access_token_rejected_as_refresh() -> None:
    token = auth_service.create_access_token(7)
    with pytest.raises(jwt.InvalidTokenError):
        auth_service.decode_refresh_token(token)


def test_oauth_state_roundtrip() -> None:
    state = auth_service.create_oauth_state(99)
    assert auth_service.decode_oauth_state(state) == 99


def test_oauth_state_rejects_access_token() -> None:
    token = auth_service.create_access_token(1)
    with pytest.raises(jwt.InvalidTokenError):
        auth_service.decode_oauth_state(token)


def test_tampered_token_fails() -> None:
    token = auth_service.create_access_token(1)
    parts = token.split(".")
    # Corrupt payload segment
    bad = f"{parts[0]}.{parts[1][:-2]}xx.{parts[2]}"
    with pytest.raises(jwt.PyJWTError):
        auth_service.decode_access_token(bad)


def test_token_signed_with_wrong_secret_fails() -> None:
    token = jwt.encode(
        {"sub": "1", "type": "access"},
        "totally-wrong-secret-at-least-32b",
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(jwt.PyJWTError):
        auth_service.decode_access_token(token)
