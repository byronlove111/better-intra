from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth_service import extract_avatar_url, require_forty_two_oauth_config
from app.config import settings
from app.users import user_repository
from app.users.user_model import User


def refresh_forty_two_tokens(refresh_token: str) -> dict[str, Any]:
    require_forty_two_oauth_config()
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            settings.forty_two_token_url,
            data={
                "grant_type": "refresh_token",
                "client_id": settings.forty_two_client_id,
                "client_secret": settings.forty_two_client_secret,
                "refresh_token": refresh_token,
            },
        )
        response.raise_for_status()
        return response.json()


def get_valid_forty_two_access_token(db: Session, user: User) -> str:
    if not user.forty_two_access_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account first",
        )

    now = datetime.now(UTC)
    expires_at = user.forty_two_token_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    still_valid = expires_at is not None and expires_at > now + timedelta(seconds=60)
    if still_valid:
        return user.forty_two_access_token

    if not user.forty_two_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Intra token expired. Link your Intra account again.",
        )

    try:
        payload = refresh_forty_two_tokens(user.forty_two_refresh_token)
        access_token = str(payload["access_token"])
        refresh_token = payload.get("refresh_token") or user.forty_two_refresh_token
        expires_in = int(payload.get("expires_in", 7200))
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh Intra token. Link your Intra account again.",
        ) from exc

    user_repository.update_forty_two_tokens(
        db,
        user,
        access_token=access_token,
        refresh_token=refresh_token,
        token_expires_at=now + timedelta(seconds=expires_in),
    )
    return access_token


def fetch_intra_me(access_token: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{settings.forty_two_api_base_url}/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


def build_intra_profile(me: dict[str, Any]) -> dict[str, Any]:
    campus = []
    for item in me.get("campus") or []:
        campus.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "city": item.get("city"),
                "country": item.get("country"),
            }
        )

    cursus = []
    for item in me.get("cursus_users") or []:
        cursus_info = item.get("cursus") or {}
        cursus.append(
            {
                "id": cursus_info.get("id"),
                "name": cursus_info.get("name"),
                "slug": cursus_info.get("slug"),
                "grade": item.get("grade"),
                "level": item.get("level"),
                "begin_at": item.get("begin_at"),
                "end_at": item.get("end_at"),
                "blackholed_at": item.get("blackholed_at"),
            }
        )

    return {
        "id": me.get("id"),
        "login": me.get("login"),
        "email": me.get("email"),
        "displayname": me.get("displayname") or me.get("usual_full_name"),
        "wallet": me.get("wallet"),
        "correction_point": me.get("correction_point"),
        "location": me.get("location"),
        "pool_month": me.get("pool_month"),
        "pool_year": me.get("pool_year"),
        "avatar_url": extract_avatar_url(me),
        "campus": campus,
        "cursus": cursus,
    }
