"""Logtime analytics: aggregate Intra locations + CSV/PDF export."""

from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.analytics.analytics_schemas import (
    LogtimeAnalyticsOut,
    LogtimeDayStat,
    LogtimeWeekdayStat,
    LogtimeWeekStat,
)
from app.intra.intra_service import (
    build_location_session,
    forty_two_get,
    get_valid_forty_two_access_token,
)
from app.users.user_model import User

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MAX_LOCATION_PAGES = 20


def _default_range() -> tuple[datetime, datetime]:
    end = datetime.now(UTC)
    begin = end - timedelta(days=30)
    return begin, end


def _hours(seconds: int) -> float:
    return round(seconds / 3600, 2)


def fetch_all_locations(
    access_token: str,
    forty_two_id: int,
    *,
    begin_at: datetime,
    end_at: datetime,
) -> list[dict[str, Any]]:
    """Paginate Intra locations, then keep sessions overlapping the range.

    Intra's `range[begin_at]` is flaky / sparse for some accounts, so we fetch
    recent pages and filter client-side for stable analytics.
    """
    raw: list[dict[str, Any]] = []
    for page in range(1, MAX_LOCATION_PAGES + 1):
        params: dict[str, Any] = {
            "page[number]": page,
            "page[size]": 100,
            "sort": "-begin_at",
        }
        payload, _ = forty_two_get(access_token, f"/users/{forty_two_id}/locations", params)
        if not isinstance(payload, list) or not payload:
            break
        raw.extend(payload)
        # Stop early if the oldest session on this page is already before begin_at
        oldest = payload[-1].get("begin_at")
        if isinstance(oldest, str):
            try:
                oldest_dt = datetime.fromisoformat(oldest.replace("Z", "+00:00"))
                if oldest_dt < begin_at:
                    break
            except ValueError:
                pass
        if len(payload) < 100:
            break

    filtered: list[dict[str, Any]] = []
    for item in raw:
        begin = item.get("begin_at")
        if not isinstance(begin, str):
            continue
        try:
            begin_dt = datetime.fromisoformat(begin.replace("Z", "+00:00"))
        except ValueError:
            continue
        if begin_dt < begin_at or begin_dt > end_at:
            continue
        filtered.append(item)
    return filtered


def build_analytics(
    *,
    login: str,
    begin_at: datetime,
    end_at: datetime,
    locations: list[dict[str, Any]],
) -> LogtimeAnalyticsOut:
    sessions = [build_location_session(item) for item in locations]
    by_day: dict[str, int] = defaultdict(int)
    by_weekday: dict[int, int] = defaultdict(int)
    by_week: dict[str, int] = defaultdict(int)
    total = 0

    for session in sessions:
        seconds = int(session.get("duration_seconds") or 0)
        total += seconds
        begin = session.get("begin_at")
        if not isinstance(begin, datetime):
            continue
        day = begin.astimezone(UTC).date()
        by_day[day.isoformat()] += seconds
        by_weekday[day.weekday()] += seconds
        week_start = (day - timedelta(days=day.weekday())).isoformat()
        by_week[week_start] += seconds

    active_days = len(by_day)
    avg = int(total / active_days) if active_days else 0

    return LogtimeAnalyticsOut(
        login=login,
        begin_at=begin_at,
        end_at=end_at,
        total_seconds=total,
        total_hours=_hours(total),
        active_days=active_days,
        average_seconds_per_active_day=avg,
        average_hours_per_active_day=_hours(avg),
        sessions_count=len(sessions),
        days=[
            LogtimeDayStat(date=d, duration_seconds=s, duration_hours=_hours(s))
            for d, s in sorted(by_day.items())
        ],
        by_weekday=[
            LogtimeWeekdayStat(
                weekday=i,
                weekday_name=WEEKDAY_NAMES[i],
                duration_seconds=by_weekday.get(i, 0),
                duration_hours=_hours(by_weekday.get(i, 0)),
            )
            for i in range(7)
        ],
        by_week=[
            LogtimeWeekStat(week_start=w, duration_seconds=s, duration_hours=_hours(s))
            for w, s in sorted(by_week.items())
        ],
    )


def get_my_logtime_analytics(
    db: Session,
    *,
    user: User,
    begin_at: datetime | None,
    end_at: datetime | None,
) -> LogtimeAnalyticsOut:
    if user.forty_two_id is None or not user.login:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Link your Intra account first")

    if begin_at is None and end_at is None:
        begin_at, end_at = _default_range()
    elif begin_at is None or end_at is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide both begin_at and end_at, or neither for the last 30 days",
        )
    if end_at <= begin_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="end_at must be after begin_at",
        )

    access_token = get_valid_forty_two_access_token(db, user)
    locations = fetch_all_locations(
        access_token,
        user.forty_two_id,
        begin_at=begin_at,
        end_at=end_at,
    )
    return build_analytics(login=user.login, begin_at=begin_at, end_at=end_at, locations=locations)


def analytics_to_csv(data: LogtimeAnalyticsOut) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["login", data.login])
    writer.writerow(["begin_at", data.begin_at.isoformat()])
    writer.writerow(["end_at", data.end_at.isoformat()])
    writer.writerow(["total_seconds", data.total_seconds])
    writer.writerow(["total_hours", data.total_hours])
    writer.writerow(["active_days", data.active_days])
    writer.writerow([])
    writer.writerow(["date", "duration_seconds", "duration_hours"])
    for day in data.days:
        writer.writerow([day.date, day.duration_seconds, day.duration_hours])
    return buf.getvalue()


def analytics_to_pdf(data: LogtimeAnalyticsOut) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "BetterIntra - Logtime report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 8, f"Login: {data.login}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(
        0,
        8,
        f"Period: {data.begin_at.date().isoformat()} -> {data.end_at.date().isoformat()}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 7, f"Total: {data.total_hours} h ({data.total_seconds} s)", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Active days: {data.active_days}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(
        0,
        7,
        f"Avg / active day: {data.average_hours_per_active_day} h",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.cell(0, 7, f"Sessions: {data.sessions_count}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "By weekday", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=10)
    for row in data.by_weekday:
        pdf.cell(
            0,
            6,
            f"{row.weekday_name}: {row.duration_hours} h",
            new_x="LMARGIN",
            new_y="NEXT",
        )

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Daily breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(50, 7, "Date", border=1)
    pdf.cell(40, 7, "Hours", border=1)
    pdf.cell(50, 7, "Seconds", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=10)
    for day in data.days:
        pdf.cell(50, 6, day.date, border=1)
        pdf.cell(40, 6, str(day.duration_hours), border=1)
        pdf.cell(50, 6, str(day.duration_seconds), border=1, new_x="LMARGIN", new_y="NEXT")

    if not data.days:
        pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 8, "No location sessions in this period.", new_x="LMARGIN", new_y="NEXT")

    out = pdf.output()
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return out.encode("latin-1")
