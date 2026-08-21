from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.events import event_repository
from app.events.event_model import Event
from app.events.event_schemas import EventCreate, EventOut, EventUpdate
from app.users.user_model import User


def _to_out(row: Event) -> EventOut:
    return EventOut(
        id=row.id,
        creator_id=row.creator_id,
        title=row.title,
        description=row.description,
        location=row.location,
        url=row.url,
        begin_at=row.begin_at,
        end_at=row.end_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def create_event(db: Session, *, user: User, data: EventCreate) -> EventOut:
    row = event_repository.create(
        db,
        creator_id=user.id,
        title=data.title.strip(),
        description=data.description,
        location=data.location,
        url=data.url,
        begin_at=data.begin_at,
        end_at=data.end_at,
    )
    out = _to_out(row)

    from app.notifications.notification_schemas import NotificationType
    from app.notifications.notification_service import notify_many
    from app.users import user_repository

    recipient_ids = user_repository.list_all_ids(db, exclude_user_id=user.id)
    if recipient_ids:
        who = user.login or user.email
        await notify_many(
            db,
            user_ids=recipient_ids,
            type=NotificationType.event,
            body=f"New event: {out.title} (by {who})",
            url="/agenda",
        )
    return out


def list_events(
    db: Session,
    *,
    creator_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[EventOut]:
    rows = (
        event_repository.list_by_creator(
            db, creator_id=creator_id, limit=limit, offset=offset
        )
        if creator_id is not None
        else event_repository.list_all(db, limit=limit, offset=offset)
    )
    return [_to_out(r) for r in rows]


def get_event(
    db: Session,
    event_id: int,
    *,
    owner: User | None = None,
) -> EventOut:
    row = event_repository.get_by_id(db, event_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if owner is not None and row.creator_id != owner.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _to_out(row)


def _require_owner(row: Event, user: User) -> None:
    if row.creator_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the event creator can modify this event",
        )


def update_event(db: Session, *, user: User, event_id: int, data: EventUpdate) -> EventOut:
    row = event_repository.get_by_id(db, event_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    _require_owner(row, user)

    fields = data.model_dump(exclude_unset=True)
    if "title" in fields and fields["title"] is not None:
        fields["title"] = fields["title"].strip()

    begin_at = fields.get("begin_at", row.begin_at)
    end_at = fields.get("end_at", row.end_at)
    if end_at <= begin_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="end_at must be after begin_at",
        )

    row = event_repository.update(db, row, **fields)
    return _to_out(row)


def delete_event(db: Session, *, user: User, event_id: int) -> None:
    row = event_repository.get_by_id(db, event_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    _require_owner(row, user)
    event_repository.delete(db, row)
