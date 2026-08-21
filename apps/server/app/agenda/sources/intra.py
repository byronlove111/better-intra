from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.agenda.agenda_schemas import AgendaEventOut, AgendaSource
from app.intra.intra_service import (
    build_event,
    fetch_intra_me,
    forty_two_get_cached,
    get_valid_forty_two_access_token,
    primary_campus_id,
)
from app.users.user_model import User


class IntraAgendaSource:
    source = AgendaSource.intra

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
        if not user.is_intra_linked():
            return []

        access_token = get_valid_forty_two_access_token(db, user)
        me = fetch_intra_me(access_token, cache_key=str(user.id))
        campus_id = primary_campus_id(me)
        if campus_id is None:
            return []

        params: dict[str, Any] = {
            "page[number]": 1,
            "page[size]": 100,
            "sort": "begin_at",
        }
        if kind:
            params["filter[kind]"] = kind
        if q:
            params["filter[name]"] = q.strip()
        if begin_at is not None and end_at is not None:
            params["range[begin_at]"] = f"{begin_at.isoformat()},{end_at.isoformat()}"
        elif begin_at is not None:
            # Intra range needs both bounds; use a far future end when only begin is set.
            far_end = begin_at.replace(year=begin_at.year + 5)
            params["range[begin_at]"] = f"{begin_at.isoformat()},{far_end.isoformat()}"
        elif end_at is not None:
            far_begin = end_at.replace(year=max(end_at.year - 5, 2000))
            params["range[begin_at]"] = f"{far_begin.isoformat()},{end_at.isoformat()}"

        range_key = params.get("range[begin_at]", "")
        payload, _ = forty_two_get_cached(
            access_token,
            f"/campus/{campus_id}/events",
            params,
            cache_key=(
                f"events:{campus_id}:1:100:begin_at:"
                f"{kind or ''}:{(q or '').strip()}:{range_key}"
            ),
        )
        if not isinstance(payload, list):
            return []

        items: list[AgendaEventOut] = []
        for raw in payload:
            built = build_event(raw)
            title = built.get("name") or "Untitled event"
            event_begin = built.get("begin_at")
            event_end = built.get("end_at")

            # Client-side range filter when only one bound was provided
            if begin_at is not None and end_at is None and event_end is not None:
                if _as_dt(event_end) < begin_at:
                    continue
            if end_at is not None and begin_at is None and event_begin is not None:
                if _as_dt(event_begin) > end_at:
                    continue

            eid = built.get("id")
            if eid is None:
                continue
            items.append(
                AgendaEventOut(
                    id=f"intra:{eid}",
                    source=AgendaSource.intra,
                    external_id=str(eid),
                    title=title,
                    description=built.get("description"),
                    location=built.get("location"),
                    begin_at=event_begin,
                    end_at=event_end,
                    url=None,
                    kind=built.get("kind"),
                    creator_id=None,
                    can_edit=False,
                )
            )
        return items


def _as_dt(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
