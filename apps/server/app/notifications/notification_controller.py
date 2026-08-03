from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.deps import get_db, require_intra_linked
from app.notifications import notification_service
from app.notifications.notification_schemas import NotificationListOut
from app.users.user_model import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get(
    "",
    response_model=NotificationListOut,
    summary="List my notifications",
    description=(
        "Simple inbox: type, body, clickable url, created_at. "
        "No mute / no mark-as-read. Items older than 7 days are deleted automatically."
    ),
)
def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> NotificationListOut:
    return notification_service.list_notifications(db, user_id=current_user.id, limit=limit)
