import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, require_intra_linked
from app.intra.intra_schemas import IntraProfileOut
from app.intra.intra_service import (
    build_intra_profile,
    fetch_intra_me,
    get_valid_forty_two_access_token,
)
from app.users.user_model import User

router = APIRouter(tags=["intra"])


@router.get(
    "/me/intra",
    response_model=IntraProfileOut,
    summary="My Intra profile",
    description=(
        "Proxy to 42 `GET /v2/me` for the authenticated user. "
        "Requires a linked Intra account (`require_intra_linked`). "
        "Returns a filtered profile: login, avatar, campus, wallet, cursus levels, etc."
    ),
)
def get_my_intra_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> IntraProfileOut:
    access_token = get_valid_forty_two_access_token(db, current_user)
    try:
        me = fetch_intra_me(access_token)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch Intra profile from 42 API",
        ) from exc

    return IntraProfileOut.model_validate(build_intra_profile(me))
