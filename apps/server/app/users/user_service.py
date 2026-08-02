from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.intra.intra_schemas import IntraProfileOut
from app.intra.intra_service import (
    build_intra_profile,
    fetch_intra_me,
    fetch_intra_user,
    get_valid_forty_two_access_token,
)
from app.users.user_model import User
from app.users.user_schemas import UserProfileOut


def _base_profile_dict(user: User, *, include_email: bool) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email if include_email else None,
        "login": user.login,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio if user.is_intra_linked() else None,
        "is_intra_linked": user.is_intra_linked(),
        "intra": None,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def build_unified_profile(
    db: Session,
    *,
    target: User,
    viewer: User,
    include_email: bool,
) -> UserProfileOut:
    """Compose BetterIntra fields + nested Intra profile when possible."""
    payload = _base_profile_dict(target, include_email=include_email)

    can_fetch_intra = target.is_intra_linked() and viewer.is_intra_linked()
    if not can_fetch_intra:
        return UserProfileOut.model_validate(payload)

    access_token = get_valid_forty_two_access_token(db, viewer)
    if target.id == viewer.id:
        me = fetch_intra_me(access_token)
        payload["intra"] = IntraProfileOut.model_validate(build_intra_profile(me))
    else:
        login = target.login
        if not login:
            return UserProfileOut.model_validate(payload)
        raw = fetch_intra_user(access_token, login)
        intra = build_intra_profile(raw)
        intra["email"] = None
        payload["intra"] = IntraProfileOut.model_validate(intra)

    return UserProfileOut.model_validate(payload)


def require_bio_allowed(user: User) -> None:
    if not user.is_intra_linked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account before setting a bio",
        )
