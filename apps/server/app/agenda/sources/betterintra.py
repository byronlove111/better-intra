from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.agenda.agenda_schemas import AgendaEventOut, AgendaSource
from app.events.event_model import Event
from app.users.user_model import User


class BetterIntraAgendaSource:
    source = AgendaSource.betterintra

    def list_events(
        self,
        db: Session,
        *,
        user: User,
        begin_at: datetime | None,
        end_at: datetime | None,
        q: str | None,
        kind: str | None,
    ) -> list[AgendaEventOut]:
        del kind  # BetterIntra events have no Intra-like kind yet
        stmt = select(Event)
        if begin_at is not None:
            stmt = stmt.where(Event.end_at >= begin_at)
        if end_at is not None:
            stmt = stmt.where(Event.begin_at <= end_at)
        if q:
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(or_(Event.title.ilike(pattern), Event.description.ilike(pattern)))
        stmt = stmt.order_by(Event.begin_at.asc()).limit(500)

        rows = list(db.scalars(stmt).all())
        return [
            AgendaEventOut(
                id=f"betterintra:{row.id}",
                source=AgendaSource.betterintra,
                external_id=str(row.id),
                title=row.title,
                description=row.description,
                location=row.location,
                begin_at=row.begin_at,
                end_at=row.end_at,
                url=None,
                kind=None,
                creator_id=row.creator_id,
                can_edit=row.creator_id == user.id,
            )
            for row in rows
        ]
