from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db, require_intra_linked
from app.users import user_repository
from app.users.user_model import User
from app.users.user_schemas import UpdateProfileRequest, UserProfileOut
from app.users.user_service import build_my_unified_profile, build_profile_by_login, require_bio_allowed

router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------------------
# ME — UNIFIED PROFILE
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=UserProfileOut,
    summary="My unified profile",
    description=(
        "BetterIntra account + nested `intra` when linked. "
        "`is_betterintra_linked` is always true for /me. "
        "`is_intra_linked` drives the 'Link your Intra' CTA."
    ),
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileOut:
    return build_my_unified_profile(db, user=current_user)


@router.patch(
    "/me",
    response_model=UserProfileOut,
    summary="Update my profile (bio)",
    description="Bio requires linked Intra (403 otherwise).",
)
def update_my_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileOut:
    require_bio_allowed(current_user)
    user = user_repository.update_bio(db, current_user, bio=body.bio.strip())
    return build_my_unified_profile(db, user=user)


# ---------------------------------------------------------------------------
# USERS — BY INTRA LOGIN (overlay)
# ---------------------------------------------------------------------------


@router.get(
    "/{login}",
    response_model=UserProfileOut,
    summary="Profile by Intra login",
    description=(
        "Intra-first: works for any 42 login. "
        "When `is_betterintra_linked` is true, includes BetterIntra id/bio for the front permission gate."
    ),
)
def get_user_profile(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> UserProfileOut:
    return build_profile_by_login(db, viewer=current_user, login=login)
