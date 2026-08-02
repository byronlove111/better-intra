from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.users import user_repository
from app.users.user_model import User
from app.users.user_schemas import UpdateProfileRequest, UserProfileOut
from app.users.user_service import build_unified_profile, require_bio_allowed

router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------------------
# ME — UNIFIED PROFILE
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=UserProfileOut,
    summary="My unified profile",
    description=(
        "Single profile payload: BetterIntra fields + nested `intra` from the 42 API when linked. "
        "If Intra is not linked, `intra` is null and `bio` is always null."
    ),
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileOut:
    return build_unified_profile(
        db,
        target=current_user,
        viewer=current_user,
        include_email=True,
    )


@router.patch(
    "/me",
    response_model=UserProfileOut,
    summary="Update my profile (bio)",
    description=(
        "Update BetterIntra-only fields. **Bio requires a linked Intra account** — "
        "returns 403 otherwise."
    ),
)
def update_my_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileOut:
    require_bio_allowed(current_user)
    user = user_repository.update_bio(db, current_user, bio=body.bio.strip())
    return build_unified_profile(
        db,
        target=user,
        viewer=user,
        include_email=True,
    )


# ---------------------------------------------------------------------------
# USERS — BY LOGIN
# ---------------------------------------------------------------------------


@router.get(
    "/{login}",
    response_model=UserProfileOut,
    summary="Unified profile by Intra login",
    description=(
        "BetterIntra user looked up by `login` (must have linked Intra at least once). "
        "Nested `intra` is filled when both the viewer and the target are Intra-linked. "
        "Email is omitted for other users."
    ),
)
def get_user_profile(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileOut:
    target = user_repository.get_by_login(db, login)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BetterIntra user not found for this login",
        )
    return build_unified_profile(
        db,
        target=target,
        viewer=current_user,
        include_email=False,
    )
