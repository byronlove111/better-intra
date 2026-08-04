from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.auth_service import extract_avatar_url
from app.friends import friend_repository
from app.friends.friend_schemas import FollowListOut, FollowStatsOut, FriendOut
from app.intra import intra_person_repository
from app.intra.intra_person_model import IntraPerson
from app.intra.intra_service import fetch_intra_user, get_valid_forty_two_access_token
from app.realtime.ws_manager import ws_manager
from app.users import user_repository
from app.users.user_model import User


def _friend_from_person(person: IntraPerson, followed_at, bi_user: User | None) -> FriendOut:
    linked = bi_user is not None
    return FriendOut(
        forty_two_id=person.forty_two_id,
        login=person.login,
        display_name=person.display_name or (bi_user.display_name if bi_user else None),
        avatar_url=person.avatar_url or (bi_user.avatar_url if bi_user else None),
        followed_at=followed_at,
        is_betterintra_linked=linked,
        betterintra_user_id=bi_user.id if bi_user else None,
        bio=bi_user.bio if bi_user and bi_user.is_intra_linked() else None,
        is_online=ws_manager.is_online(bi_user.id) if bi_user else None,
    )


def _friend_from_follower_user(user: User, followed_at) -> FriendOut:
    # Followers are always BetterIntra users with Intra linked (to follow)
    return FriendOut(
        forty_two_id=int(user.forty_two_id) if user.forty_two_id is not None else 0,
        login=user.login or "",
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        followed_at=followed_at,
        is_betterintra_linked=True,
        betterintra_user_id=user.id,
        bio=user.bio,
        is_online=ws_manager.is_online(user.id),
    )


def resolve_intra_person(db: Session, *, viewer: User, login: str) -> IntraPerson:
    access_token = get_valid_forty_two_access_token(db, viewer)
    raw = fetch_intra_user(access_token, login)
    forty_two_id = int(raw["id"])
    bi_user = user_repository.get_by_forty_two_id(db, forty_two_id)
    return intra_person_repository.upsert_from_intra(
        db,
        forty_two_id=forty_two_id,
        login=str(raw["login"]),
        display_name=raw.get("displayname") or raw.get("usual_full_name"),
        avatar_url=extract_avatar_url(raw),
        betterintra_user_id=bi_user.id if bi_user else None,
    )


async def follow_user(db: Session, *, follower: User, login: str) -> FriendOut:
    person = resolve_intra_person(db, viewer=follower, login=login)
    if follower.forty_two_id is not None and person.forty_two_id == follower.forty_two_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot follow yourself",
        )

    existing = friend_repository.get_follow(
        db,
        follower_id=follower.id,
        following_forty_two_id=person.forty_two_id,
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already following this user",
        )

    try:
        friendship = friend_repository.create_follow(
            db,
            follower_id=follower.id,
            following_forty_two_id=person.forty_two_id,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already following this user",
        ) from exc

    bi_user = user_repository.get_by_id(db, person.betterintra_user_id) if person.betterintra_user_id else None
    if bi_user is not None and follower.login:
        from app.notifications.notification_schemas import NotificationType
        from app.notifications.notification_service import notify

        await notify(
            db,
            user_id=bi_user.id,
            type=NotificationType.follow,
            body=f"{follower.login} started following you",
            url=f"/users/{follower.login}",
        )
    return _friend_from_person(person, friendship.created_at, bi_user)


def unfollow_user(db: Session, *, follower: User, login: str) -> None:
    person = intra_person_repository.get_by_login(db, login)
    if person is None:
        # Still try resolve so unfollow works after cache miss
        person = resolve_intra_person(db, viewer=follower, login=login)

    friendship = friend_repository.get_follow(
        db,
        follower_id=follower.id,
        following_forty_two_id=person.forty_two_id,
    )
    if friendship is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not following this user",
        )
    friend_repository.delete_follow(db, friendship)


def list_following(db: Session, *, user: User) -> FollowListOut:
    rows = friend_repository.list_following(db, follower_id=user.id)
    items = [_friend_from_person(person, friendship.created_at, bi) for person, friendship, bi in rows]
    return FollowListOut(items=items, count=len(items))


def list_followers_for_person(db: Session, *, person: IntraPerson) -> FollowListOut:
    rows = friend_repository.list_followers(db, following_forty_two_id=person.forty_two_id)
    items = [_friend_from_follower_user(user, friendship.created_at) for user, friendship in rows]
    return FollowListOut(items=items, count=len(items))


def list_followers(db: Session, *, user: User) -> FollowListOut:
    if user.forty_two_id is None:
        return FollowListOut(items=[], count=0)
    person = intra_person_repository.get_by_forty_two_id(db, user.forty_two_id)
    if person is None:
        return FollowListOut(items=[], count=0)
    return list_followers_for_person(db, person=person)


def list_following_for_login(db: Session, *, viewer: User, login: str) -> FollowListOut:
    person = resolve_intra_person(db, viewer=viewer, login=login)
    if person.betterintra_user_id is None:
        # Intra-only identity cannot follow others on BetterIntra yet
        return FollowListOut(items=[], count=0)
    bi_user = user_repository.get_by_id(db, person.betterintra_user_id)
    if bi_user is None:
        return FollowListOut(items=[], count=0)
    return list_following(db, user=bi_user)


def list_followers_for_login(db: Session, *, viewer: User, login: str) -> FollowListOut:
    person = resolve_intra_person(db, viewer=viewer, login=login)
    return list_followers_for_person(db, person=person)


def stats_for_user(db: Session, *, user: User, viewer: User) -> FollowStatsOut:
    following_count = friend_repository.count_following(db, follower_id=user.id)
    followers_count = 0
    forty_two_id = user.forty_two_id or 0
    if user.forty_two_id is not None:
        followers_count = friend_repository.count_followers(db, following_forty_two_id=user.forty_two_id)
    is_following = None
    if viewer.id != user.id and user.forty_two_id is not None:
        is_following = (
            friend_repository.get_follow(
                db,
                follower_id=viewer.id,
                following_forty_two_id=user.forty_two_id,
            )
            is not None
        )
    return FollowStatsOut(
        login=user.login or "",
        forty_two_id=int(forty_two_id),
        following_count=following_count,
        followers_count=followers_count,
        is_following=is_following,
        is_betterintra_linked=True,
    )


def stats_for_login(db: Session, *, login: str, viewer: User) -> FollowStatsOut:
    person = resolve_intra_person(db, viewer=viewer, login=login)
    following_count = 0
    if person.betterintra_user_id is not None:
        following_count = friend_repository.count_following(db, follower_id=person.betterintra_user_id)
    followers_count = friend_repository.count_followers(db, following_forty_two_id=person.forty_two_id)
    is_following = None
    if viewer.forty_two_id != person.forty_two_id:
        is_following = (
            friend_repository.get_follow(
                db,
                follower_id=viewer.id,
                following_forty_two_id=person.forty_two_id,
            )
            is not None
        )
    return FollowStatsOut(
        login=person.login,
        forty_two_id=person.forty_two_id,
        following_count=following_count,
        followers_count=followers_count,
        is_following=is_following,
        is_betterintra_linked=person.betterintra_user_id is not None,
    )
