from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.agenda import agenda_service
from app.agenda.agenda_schemas import AgendaOut, AgendaSource
from app.deps import get_current_user, get_db
from app.events import event_service
from app.events.event_schemas import EventCreate, EventOut, EventUpdate
from app.users.user_model import User

router = APIRouter(prefix="/events", tags=["events"])


@router.get(
    "",
    response_model=AgendaOut,
    summary="List events (unified feed)",
    description=(
        "Single calendar feed: Intra campus events + BetterIntra events, normalized. "
        "Filter with `sources`, date range, `q`, `kind`. "
        "Without a date range, defaults to upcoming (begin_at >= now). "
        "Create/update/delete BetterIntra events with POST/PATCH/DELETE on this same prefix."
    ),
)
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    sources: list[AgendaSource] | None = Query(
        default=None,
        description="Subset of sources (repeat param). Default: intra, betterintra",
    ),
    begin_at: datetime | None = Query(None),
    end_at: datetime | None = Query(None),
    q: str | None = Query(None, min_length=1, description="Title/name search"),
    kind: str | None = Query(None, description="Intra event kind filter"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> AgendaOut:
    return agenda_service.build_agenda(
        db,
        user=current_user,
        sources=sources,
        begin_at=begin_at,
        end_at=end_at,
        q=q,
        kind=kind,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a BetterIntra event",
    description="Create an event hosted on BetterIntra (JWT). Appears in GET /events with source=betterintra.",
)
async def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventOut:
    return await event_service.create_event(db, user=current_user, data=body)


@router.get(
    "/{event_id}",
    response_model=EventOut,
    summary="Get a BetterIntra event",
    description="Numeric BetterIntra event id only (not Intra campus ids).",
)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> EventOut:
    return event_service.get_event(db, event_id)


@router.patch(
    "/{event_id}",
    response_model=EventOut,
    summary="Update a BetterIntra event",
    description="Only the creator can update.",
)
def update_event(
    event_id: int,
    body: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventOut:
    return event_service.update_event(db, user=current_user, event_id=event_id, data=body)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a BetterIntra event",
    description="Only the creator can delete.",
)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    event_service.delete_event(db, user=current_user, event_id=event_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
