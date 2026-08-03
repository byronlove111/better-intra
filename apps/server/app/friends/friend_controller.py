from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.deps import get_db, require_intra_linked
from app.friends import friend_service
from app.friends.friend_schemas import FollowListOut, FollowStatsOut, FriendOut
from app.users.user_model import User

router = APIRouter(prefix="/friends", tags=["friends"])


# ---------------------------------------------------------------------------
# ME — FOLLOWING / FOLLOWERS / STATS
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=FollowListOut,
    summary="People I follow",
    description="Alias of `/friends/following`. Requires JWT + linked Intra.",
)
@router.get(
    "/following",
    response_model=FollowListOut,
    summary="People I follow",
    description=(
        "List + count of Intra identities I follow (with or without BetterIntra). "
        "When `is_betterintra_linked` is true, bio / betterintra_user_id are filled."
    ),
)
def list_my_following(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> FollowListOut:
    return friend_service.list_following(db, user=current_user)


@router.get(
    "/followers",
    response_model=FollowListOut,
    summary="People who follow me",
    description="List + count of my followers (BetterIntra users). Requires JWT + linked Intra.",
)
def list_my_followers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> FollowListOut:
    return friend_service.list_followers(db, user=current_user)


@router.get(
    "/stats",
    response_model=FollowStatsOut,
    summary="My follow stats",
)
def my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> FollowStatsOut:
    return friend_service.stats_for_user(db, user=current_user, viewer=current_user)


# ---------------------------------------------------------------------------
# USER — FOLLOWING / FOLLOWERS / STATS
# ---------------------------------------------------------------------------


@router.get(
    "/{login}/following",
    response_model=FollowListOut,
    summary="People a login follows",
    description="Empty if that Intra login has no BetterIntra account yet.",
)
def list_user_following(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> FollowListOut:
    return friend_service.list_following_for_login(db, viewer=current_user, login=login)


@router.get(
    "/{login}/followers",
    response_model=FollowListOut,
    summary="People who follow a login",
)
def list_user_followers(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> FollowListOut:
    return friend_service.list_followers_for_login(db, viewer=current_user, login=login)


@router.get(
    "/{login}/stats",
    response_model=FollowStatsOut,
    summary="Follow stats for an Intra login",
)
def user_stats(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> FollowStatsOut:
    return friend_service.stats_for_login(db, login=login, viewer=current_user)


# ---------------------------------------------------------------------------
# FOLLOW / UNFOLLOW
# ---------------------------------------------------------------------------


@router.post(
    "/{login}",
    response_model=FriendOut,
    status_code=status.HTTP_201_CREATED,
    summary="Follow any Intra login",
    description=(
        "Follow any 42 login (creates/updates `intra_people`). "
        "No BetterIntra account required on the target. "
        "Response includes `is_betterintra_linked` + bio when they have a BI account."
    ),
)
def follow_user(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> FriendOut:
    return friend_service.follow_user(db, follower=current_user, login=login)


@router.delete(
    "/{login}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unfollow an Intra login",
)
def unfollow_user(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> Response:
    friend_service.unfollow_user(db, follower=current_user, login=login)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
