from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.users.user_model import User


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


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
    return user
