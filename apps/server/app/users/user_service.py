from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth_service import extract_avatar_url
from app.intra import intra_person_repository
from app.intra.intra_schemas import IntraProfileOut
from app.intra.intra_service import (
    build_intra_profile,
    fetch_intra_me,
    fetch_intra_user,
    get_valid_forty_two_access_token,
)
from app.users import user_repository
from app.users.user_model import User
from app.users.user_schemas import UserProfileOut


def build_my_unified_profile(db: Session, *, user: User) -> UserProfileOut:
    payload: dict[str, Any] = {
        "id": user.id,
        "email": user.email,
        "login": user.login,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "forty_two_id": user.forty_two_id,
        "bio": user.bio if user.is_intra_linked() else None,
        "is_betterintra_linked": True,
        "is_intra_linked": user.is_intra_linked(),
        "intra": None,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }
    if user.is_intra_linked():
        access_token = get_valid_forty_two_access_token(db, user)
        me = fetch_intra_me(access_token)
        payload["intra"] = IntraProfileOut.model_validate(build_intra_profile(me))
        # keep cache fresh on intra_people
        intra_person_repository.attach_betterintra_user(
            db,
            forty_two_id=int(me["id"]),
            login=str(me["login"]),
            display_name=me.get("displayname") or me.get("usual_full_name"),
            avatar_url=extract_avatar_url(me),
            user_id=user.id,
        )
    return UserProfileOut.model_validate(payload)


def build_profile_by_login(db: Session, *, viewer: User, login: str) -> UserProfileOut:
    """Intra-first: any 42 login. BetterIntra fields only if is_betterintra_linked."""
    if not viewer.is_intra_linked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account first",
        )

    access_token = get_valid_forty_two_access_token(db, viewer)
    raw = fetch_intra_user(access_token, login)
    intra = build_intra_profile(raw)
    intra["email"] = None
    forty_two_id = int(raw["id"])
    resolved_login = str(raw["login"])

    bi_user = user_repository.get_by_forty_two_id(db, forty_two_id)
    person = intra_person_repository.upsert_from_intra(
        db,
        forty_two_id=forty_two_id,
        login=resolved_login,
        display_name=raw.get("displayname") or raw.get("usual_full_name"),
        avatar_url=extract_avatar_url(raw),
        betterintra_user_id=bi_user.id if bi_user else None,
    )

    payload: dict[str, Any] = {
        "login": resolved_login,
        "display_name": person.display_name,
        "avatar_url": person.avatar_url,
        "forty_two_id": forty_two_id,
        "intra": IntraProfileOut.model_validate(intra),
        "is_betterintra_linked": bi_user is not None,
        "id": bi_user.id if bi_user else None,
        "email": None,
        "bio": bi_user.bio if bi_user else None,
        "is_intra_linked": True,
        "created_at": bi_user.created_at if bi_user else None,
        "updated_at": bi_user.updated_at if bi_user else None,
    }
    return UserProfileOut.model_validate(payload)


def require_bio_allowed(user: User) -> None:
    if not user.is_intra_linked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account before setting a bio",
        )
