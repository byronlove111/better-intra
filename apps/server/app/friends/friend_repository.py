from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.friends.friend_model import Friendship
from app.intra.intra_person_model import IntraPerson
from app.users.user_model import User


def get_follow(db: Session, *, follower_id: int, following_forty_two_id: int) -> Friendship | None:
    return db.scalar(
        select(Friendship).where(
            Friendship.follower_id == follower_id,
            Friendship.following_forty_two_id == following_forty_two_id,
        )
    )


def list_following(db: Session, *, follower_id: int) -> list[tuple[IntraPerson, Friendship, User | None]]:
    rows = db.execute(
        select(IntraPerson, Friendship, User)
        .join(Friendship, Friendship.following_forty_two_id == IntraPerson.forty_two_id)
        .outerjoin(User, User.id == IntraPerson.betterintra_user_id)
        .where(Friendship.follower_id == follower_id)
        .order_by(Friendship.created_at.desc())
    ).all()
    return [(person, friendship, user) for person, friendship, user in rows]


def list_followers(db: Session, *, following_forty_two_id: int) -> list[tuple[User, Friendship]]:
    rows = db.execute(
        select(User, Friendship)
        .join(Friendship, Friendship.follower_id == User.id)
        .where(Friendship.following_forty_two_id == following_forty_two_id)
        .order_by(Friendship.created_at.desc())
    ).all()
    return [(user, friendship) for user, friendship in rows]


def list_following_user_ids(db: Session, *, follower_id: int) -> list[int]:
    """BetterIntra user ids of Intra people this user follows (linked accounts only)."""
    rows = db.scalars(
        select(IntraPerson.betterintra_user_id)
        .join(Friendship, Friendship.following_forty_two_id == IntraPerson.forty_two_id)
        .where(
            Friendship.follower_id == follower_id,
            IntraPerson.betterintra_user_id.is_not(None),
        )
    ).all()
    return [int(uid) for uid in rows if uid is not None]


def list_follower_user_ids(db: Session, *, following_forty_two_id: int) -> list[int]:
    """BetterIntra user ids that follow this Intra identity."""
    rows = db.scalars(
        select(Friendship.follower_id).where(Friendship.following_forty_two_id == following_forty_two_id)
    ).all()
    return [int(uid) for uid in rows]


def count_following(db: Session, *, follower_id: int) -> int:
    return int(
        db.scalar(select(func.count()).select_from(Friendship).where(Friendship.follower_id == follower_id)) or 0
    )


def count_followers(db: Session, *, following_forty_two_id: int) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(Friendship).where(Friendship.following_forty_two_id == following_forty_two_id)
        )
        or 0
    )


def create_follow(db: Session, *, follower_id: int, following_forty_two_id: int) -> Friendship:
    friendship = Friendship(follower_id=follower_id, following_forty_two_id=following_forty_two_id)
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return friendship


def delete_follow(db: Session, friendship: Friendship) -> None:
    db.delete(friendship)
    db.commit()
