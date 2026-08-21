from typing import Any

from fastapi import HTTPException, UploadFile, status
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
from app.media import media_service
from app.realtime.ws_manager import ws_manager
from app.users import user_repository
from app.users.user_model import User
from app.users.user_schemas import UserOut, UserProfileOut


def effective_avatar_url(user: User) -> str | None:
    return user.custom_avatar_url or user.avatar_url


def serialize_user(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        forty_two_id=user.forty_two_id,
        login=user.login,
        display_name=user.display_name,
        avatar_url=effective_avatar_url(user),
        banner_url=user.banner_url,
        has_custom_avatar=bool(user.custom_avatar_url),
        bio=user.bio,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def build_my_unified_profile(
    db: Session,
    *,
    user: User,
    refresh_intra: bool = True,
) -> UserProfileOut:
    payload: dict[str, Any] = {
        "id": user.id,
        "email": user.email,
        "login": user.login,
        "display_name": user.display_name,
        "avatar_url": effective_avatar_url(user),
        "banner_url": user.banner_url,
        "has_custom_avatar": bool(user.custom_avatar_url),
        "forty_two_id": user.forty_two_id,
        "bio": user.bio if user.is_intra_linked() else None,
        "is_betterintra_linked": True,
        "is_intra_linked": user.is_intra_linked(),
        "is_online": ws_manager.is_online(user.id),
        "intra": None,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }
    if user.is_intra_linked() and refresh_intra:
        access_token = get_valid_forty_two_access_token(db, user)
        me = fetch_intra_me(access_token, cache_key=str(user.id))
        payload["intra"] = IntraProfileOut.model_validate(build_intra_profile(me))
        # keep cache fresh on intra_people (Intra avatar only — never overwrite custom)
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

    avatar = (
        effective_avatar_url(bi_user)
        if bi_user
        else person.avatar_url
    )

    payload: dict[str, Any] = {
        "login": resolved_login,
        "display_name": person.display_name,
        "avatar_url": avatar,
        "banner_url": bi_user.banner_url if bi_user else None,
        "has_custom_avatar": bool(bi_user.custom_avatar_url) if bi_user else False,
        "forty_two_id": forty_two_id,
        "intra": IntraProfileOut.model_validate(intra),
        "is_betterintra_linked": bi_user is not None,
        "id": bi_user.id if bi_user else None,
        "email": None,
        "bio": bi_user.bio if bi_user else None,
        "is_online": ws_manager.is_online(bi_user.id) if bi_user else None,
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


def require_media_allowed(user: User) -> None:
    if not user.is_intra_linked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Link your Intra account before uploading media",
        )


async def upload_my_avatar(db: Session, user: User, file: UploadFile) -> UserProfileOut:
    require_media_allowed(user)
    media_service.delete_media_file(user.custom_avatar_url)
    url = await media_service.save_avatar(user.id, file)
    user = user_repository.update_custom_avatar(db, user, custom_avatar_url=url)
    # Local-only: media upload must never hit the 42 API.
    return build_my_unified_profile(db, user=user, refresh_intra=False)


async def clear_my_avatar(db: Session, user: User) -> UserProfileOut:
    require_media_allowed(user)
    media_service.delete_media_file(user.custom_avatar_url)
    user = user_repository.update_custom_avatar(db, user, custom_avatar_url=None)
    return build_my_unified_profile(db, user=user, refresh_intra=False)


async def upload_my_banner(db: Session, user: User, file: UploadFile) -> UserProfileOut:
    require_media_allowed(user)
    media_service.delete_media_file(user.banner_url)
    url = await media_service.save_banner(user.id, file)
    user = user_repository.update_banner(db, user, banner_url=url)
    return build_my_unified_profile(db, user=user, refresh_intra=False)


async def clear_my_banner(db: Session, user: User) -> UserProfileOut:
    require_media_allowed(user)
    media_service.delete_media_file(user.banner_url)
    user = user_repository.update_banner(db, user, banner_url=None)
    return build_my_unified_profile(db, user=user, refresh_intra=False)
