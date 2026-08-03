from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.deps import get_current_user_from_api_key, get_db
from app.events import event_service
from app.events.event_schemas import EventCreate, EventOut, EventUpdate
from app.users.user_model import User

router = APIRouter(prefix="/api/v1/events", tags=["public-api"])


@router.get(
    "",
    response_model=list[EventOut],
    summary="[Public API] List events",
    description="Requires `X-API-Key`. Rate-limited per key.",
)
def list_events(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user_from_api_key),
) -> list[EventOut]:
    return event_service.list_events(db, limit=limit, offset=offset)


@router.post(
    "",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
    summary="[Public API] Create event",
)
def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_api_key),
) -> EventOut:
    return event_service.create_event(db, user=current_user, data=body)


@router.get(
    "/{event_id}",
    response_model=EventOut,
    summary="[Public API] Get event",
)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user_from_api_key),
) -> EventOut:
    return event_service.get_event(db, event_id)


@router.put(
    "/{event_id}",
    response_model=EventOut,
    summary="[Public API] Replace/update event",
    description="Only the creator (API key owner) can update.",
)
def update_event(
    event_id: int,
    body: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_api_key),
) -> EventOut:
    return event_service.update_event(db, user=current_user, event_id=event_id, data=body)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[Public API] Delete event",
)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_api_key),
) -> Response:
    event_service.delete_event(db, user=current_user, event_id=event_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
