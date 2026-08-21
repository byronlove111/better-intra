from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.users.user_model import User


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_by_login(db: Session, login: str) -> User | None:
    return db.scalar(select(User).where(User.login == login))


def get_by_forty_two_id(db: Session, forty_two_id: int) -> User | None:
    return db.scalar(select(User).where(User.forty_two_id == forty_two_id))


def create_user(db: Session, *, email: str, password_hash: str) -> User:
    user = User(email=email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def link_forty_two(
    db: Session,
    user: User,
    *,
    forty_two_id: int,
    login: str,
    display_name: str | None,
    avatar_url: str | None,
    access_token: str,
    refresh_token: str | None,
    token_expires_at: datetime | None,
) -> User:
    user.forty_two_id = forty_two_id
    user.login = login
    user.display_name = display_name
    user.avatar_url = avatar_url
    user.forty_two_access_token = access_token
    user.forty_two_refresh_token = refresh_token
    user.forty_two_token_expires_at = token_expires_at
    db.add(user)
    db.commit()
    db.refresh(user)

    from app.intra import intra_person_repository

    intra_person_repository.attach_betterintra_user(
        db,
        forty_two_id=forty_two_id,
        login=login,
        display_name=display_name,
        avatar_url=avatar_url,
        user_id=user.id,
    )
    return user


def update_forty_two_tokens(
    db: Session,
    user: User,
    *,
    access_token: str,
    refresh_token: str | None,
    token_expires_at: datetime | None,
) -> User:
    user.forty_two_access_token = access_token
    user.forty_two_refresh_token = refresh_token
    user.forty_two_token_expires_at = token_expires_at
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_bio(db: Session, user: User, *, bio: str) -> User:
    user.bio = bio
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_custom_avatar(db: Session, user: User, *, custom_avatar_url: str | None) -> User:
    user.custom_avatar_url = custom_avatar_url
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_banner(db: Session, user: User, *, banner_url: str | None) -> User:
    user.banner_url = banner_url
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_all_ids(db: Session, *, exclude_user_id: int | None = None) -> list[int]:
    stmt = select(User.id)
    if exclude_user_id is not None:
        stmt = stmt.where(User.id != exclude_user_id)
    return list(db.scalars(stmt).all())
