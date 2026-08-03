from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api_keys.api_key_model import ApiKey


def create(db: Session, *, user_id: int, name: str, prefix: str, key_hash: str) -> ApiKey:
    row = ApiKey(user_id=user_id, name=name, prefix=prefix, key_hash=key_hash)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_for_user(db: Session, *, user_id: int) -> list[ApiKey]:
    return list(
        db.scalars(
            select(ApiKey).where(ApiKey.user_id == user_id).order_by(ApiKey.created_at.desc())
        ).all()
    )


def get_by_id_for_user(db: Session, *, key_id: int, user_id: int) -> ApiKey | None:
    return db.scalar(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id))


def get_active_by_hash(db: Session, *, key_hash: str) -> ApiKey | None:
    return db.scalar(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.revoked_at.is_(None))
    )


def touch_last_used(db: Session, row: ApiKey) -> None:
    row.last_used_at = datetime.now(UTC)
    db.add(row)
    db.commit()


def revoke(db: Session, row: ApiKey) -> ApiKey:
    row.revoked_at = datetime.now(UTC)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
