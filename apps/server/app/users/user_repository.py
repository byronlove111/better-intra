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
