from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from pwdlib import PasswordHash

from app.config import settings

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hash.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": datetime.now(UTC) + expires,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: int) -> str:
    expires = timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": datetime.now(UTC) + expires,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Invalid token type")
    return payload


def require_forty_two_oauth_config() -> None:
    if not settings.forty_two_client_id or not settings.forty_two_client_secret:
        raise RuntimeError("42 OAuth is not configured")


def create_oauth_state(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "type": "oauth42",
        "exp": datetime.now(UTC) + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_oauth_state(state: str) -> int:
    payload = jwt.decode(state, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "oauth42":
        raise jwt.InvalidTokenError("Invalid OAuth state")
    return int(payload["sub"])


def build_forty_two_authorize_url(state: str) -> str:
    require_forty_two_oauth_config()
    query = urlencode(
        {
            "client_id": settings.forty_two_client_id,
            "redirect_uri": settings.forty_two_redirect_uri,
            "response_type": "code",
            "scope": "public",
            "state": state,
        }
    )
    return f"{settings.forty_two_authorize_url}?{query}"


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    require_forty_two_oauth_config()
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            settings.forty_two_token_url,
            data={
                "grant_type": "authorization_code",
                "client_id": settings.forty_two_client_id,
                "client_secret": settings.forty_two_client_secret,
                "code": code,
                "redirect_uri": settings.forty_two_redirect_uri,
            },
        )
        response.raise_for_status()
        return response.json()


def fetch_forty_two_me(access_token: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{settings.forty_two_api_base_url}/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


def extract_avatar_url(me: dict[str, Any]) -> str | None:
    image = me.get("image")
    if isinstance(image, dict):
        versions = image.get("versions")
        if isinstance(versions, dict):
            for key in ("medium", "large", "small", "micro"):
                if versions.get(key):
                    return versions[key]
        if image.get("link"):
            return image["link"]
    if isinstance(image, str):
        return image
    return None
