from sqlalchemy.orm import Session

from app.notifications import notification_repository
from app.notifications.notification_model import Notification
from app.notifications.notification_schemas import NotificationListOut, NotificationOut, NotificationType
from app.realtime.ws_manager import ws_manager


def _to_out(row: Notification) -> NotificationOut:
    return NotificationOut(
        id=row.id,
        type=NotificationType(row.type),
        body=row.body,
        url=row.url,
        created_at=row.created_at,
    )


async def notify(
    db: Session,
    *,
    user_id: int,
    type: NotificationType | str,
    body: str,
    url: str,
) -> NotificationOut:
    """Create a notification and push it over WebSocket if the user is online."""
    ntype = NotificationType(type) if not isinstance(type, NotificationType) else type
    row = notification_repository.create(
        db,
        user_id=user_id,
        type=ntype.value,
        body=body.strip(),
        url=url.strip(),
    )
    out = _to_out(row)
    await ws_manager.broadcast_to_users(
        [user_id],
        {"type": "notification.created", "payload": out.model_dump(mode="json")},
    )
    return out


def list_notifications(db: Session, *, user_id: int, limit: int = 50) -> NotificationListOut:
    rows = notification_repository.list_for_user(db, user_id=user_id, limit=limit)
    return NotificationListOut(items=[_to_out(r) for r in rows])
