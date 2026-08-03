from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.notifications.notification_model import Notification

TTL_DAYS = 7


def purge_expired(db: Session) -> int:
    cutoff = datetime.now(UTC) - timedelta(days=TTL_DAYS)
    result = db.execute(delete(Notification).where(Notification.created_at < cutoff))
    db.commit()
    return int(result.rowcount or 0)


def create(
    db: Session,
    *,
    user_id: int,
    type: str,
    body: str,
    url: str,
) -> Notification:
    purge_expired(db)
    row = Notification(user_id=user_id, type=type, body=body, url=url)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_many(
    db: Session,
    *,
    user_ids: list[int],
    type: str,
    body: str,
    url: str,
) -> list[Notification]:
    if not user_ids:
        return []
    purge_expired(db)
    rows = [Notification(user_id=uid, type=type, body=body, url=url) for uid in user_ids]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def list_for_user(db: Session, *, user_id: int, limit: int = 50) -> list[Notification]:
    purge_expired(db)
    cutoff = datetime.now(UTC) - timedelta(days=TTL_DAYS)
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id, Notification.created_at >= cutoff)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        ).all()
    )
