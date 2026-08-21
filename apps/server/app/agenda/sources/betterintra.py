from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.agenda.agenda_schemas import AgendaCreatorOut, AgendaEventOut, AgendaSource
from app.events.event_model import Event
from app.users.user_model import User


def _creator_out(creator: User | None) -> AgendaCreatorOut | None:
    if creator is None:
        return None
    return AgendaCreatorOut(
        id=creator.id,
        login=creator.login,
        display_name=creator.display_name,
        avatar_url=creator.avatar_url,
        is_intra_linked=creator.is_intra_linked(),
    )


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
        creator_ids = {row.creator_id for row in rows}
        creators_by_id: dict[int, User] = {}
        if creator_ids:
            creators_by_id = {
                creator.id: creator
                for creator in db.scalars(select(User).where(User.id.in_(creator_ids))).all()
            }

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
                url=row.url,
                kind=None,
                creator_id=row.creator_id,
                creator=_creator_out(creators_by_id.get(row.creator_id)),
                can_edit=row.creator_id == user.id,
            )
            for row in rows
        ]
