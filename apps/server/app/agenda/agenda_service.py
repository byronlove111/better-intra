from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.agenda.agenda_schemas import AgendaEventOut, AgendaOut, AgendaSource
from app.agenda.sources.betterintra import BetterIntraAgendaSource
from app.agenda.sources.intra import IntraAgendaSource
from app.users.user_model import User

_PROVIDERS = {
    AgendaSource.intra: IntraAgendaSource(),
    AgendaSource.betterintra: BetterIntraAgendaSource(),
}

DEFAULT_SOURCES = [AgendaSource.intra, AgendaSource.betterintra]


def _sort_key(item: AgendaEventOut) -> tuple[int, str]:
    if item.begin_at is None:
        return (1, "")
    return (0, item.begin_at.isoformat())


def build_agenda(
    db: Session,
    *,
    user: User,
    sources: list[AgendaSource] | None,
    begin_at: datetime | None,
    end_at: datetime | None,
    q: str | None,
    kind: str | None,
    limit: int,
    offset: int,
) -> AgendaOut:
    selected = sources or list(DEFAULT_SOURCES)
    seen: set[AgendaSource] = set()
    ordered: list[AgendaSource] = []
    for s in selected:
        if s not in seen:
            seen.add(s)
            ordered.append(s)

    # Default to upcoming feed when no range is provided (avoids drowning in Intra history).
    effective_begin = begin_at
    if begin_at is None and end_at is None:
        effective_begin = datetime.now(UTC)

    merged: list[AgendaEventOut] = []
    for source in ordered:
        provider = _PROVIDERS[source]
        merged.extend(
            provider.list_events(
                db,
                user=user,
                begin_at=effective_begin,
                end_at=end_at,
                q=q,
                kind=kind if source == AgendaSource.intra else None,
            )
        )

    merged.sort(key=_sort_key)
    page = merged[offset : offset + limit]
    return AgendaOut(
        items=page,
        sources_included=ordered,
        meta={
            "limit": limit,
            "offset": offset,
            "total_matched": len(merged),
            "returned": len(page),
            "begin_at": effective_begin.isoformat() if effective_begin else None,
            "end_at": end_at.isoformat() if end_at else None,
        },
    )
