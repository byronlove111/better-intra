from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.events.event_model import Event


def create(
    db: Session,
    *,
    creator_id: int,
    title: str,
    description: str | None,
    location: str | None,
    url: str | None,
    begin_at: datetime,
    end_at: datetime,
) -> Event:
    row = Event(
        creator_id=creator_id,
        title=title,
        description=description,
        location=location,
        url=url,
        begin_at=begin_at,
        end_at=end_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_all(db: Session, *, limit: int = 100, offset: int = 0) -> list[Event]:
    return list(
        db.scalars(
            select(Event).order_by(Event.begin_at.asc()).offset(offset).limit(limit)
        ).all()
    )


def list_by_creator(
    db: Session,
    *,
    creator_id: int,
    limit: int = 100,
    offset: int = 0,
) -> list[Event]:
    return list(
        db.scalars(
            select(Event)
            .where(Event.creator_id == creator_id)
            .order_by(Event.begin_at.asc())
            .offset(offset)
            .limit(limit)
        ).all()
    )


def get_by_id(db: Session, event_id: int) -> Event | None:
    return db.get(Event, event_id)


def update(db: Session, row: Event, **fields: object) -> Event:
    for key, value in fields.items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete(db: Session, row: Event) -> None:
    db.delete(row)
    db.commit()
