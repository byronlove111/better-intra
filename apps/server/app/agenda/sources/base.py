from datetime import datetime
from typing import Protocol

from sqlalchemy.orm import Session

from app.agenda.agenda_schemas import AgendaEventOut, AgendaSource
from app.users.user_model import User


class AgendaSourceProvider(Protocol):
    source: AgendaSource

    def list_events(
        self,
        db: Session,
        *,
        user: User,
        begin_at: datetime | None,
        end_at: datetime | None,
        q: str | None,
        kind: str | None,
    ) -> list[AgendaEventOut]: ...
