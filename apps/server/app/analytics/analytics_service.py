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


def _fmt_hours(seconds: int) -> str:
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours and minutes:
        return f"{hours}h {minutes:02d}m"
    if hours:
        return f"{hours}h"
    return f"{minutes}m"


def analytics_to_pdf(data: LogtimeAnalyticsOut) -> bytes:
    """Polished one-pager-style report (multi-page if many days)."""

    # Palette (RGB) — slate + teal, no purple cliché
    ink = (24, 32, 40)
    muted = (100, 112, 124)
    line = (220, 226, 232)
    band = (15, 76, 92)  # deep teal
    accent = (20, 160, 140)
    card_bg = (245, 248, 250)
    zebra = (250, 252, 253)

    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    page_w = pdf.w - pdf.l_margin - pdf.r_margin

    # --- Header band ---
    pdf.set_fill_color(*band)
    pdf.rect(0, 0, pdf.w, 36, style="F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(pdf.l_margin, 10)
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(page_w, 8, "BetterIntra", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=11)
    pdf.set_x(pdf.l_margin)
    pdf.cell(page_w, 6, "Logtime analytics report", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(42)
    pdf.set_text_color(*ink)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(page_w * 0.5, 7, f"@{data.login}", new_x="RIGHT")
    pdf.set_font("Helvetica", size=10)
    pdf.set_text_color(*muted)
    period = f"{data.begin_at.date().isoformat()}  to  {data.end_at.date().isoformat()}"
    pdf.cell(page_w * 0.5, 7, period, align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # --- KPI cards ---
    cards = [
        ("Total time", _fmt_hours(data.total_seconds), f"{data.total_hours} h"),
        ("Active days", str(data.active_days), "days with presence"),
        ("Daily average", _fmt_hours(data.average_seconds_per_active_day), "per active day"),
        ("Sessions", str(data.sessions_count), "location check-ins"),
    ]
    gap = 3.0
    card_w = (page_w - gap * 3) / 4
    card_h = 28.0
    y0 = pdf.get_y()
    for i, (label, value, hint) in enumerate(cards):
        x = pdf.l_margin + i * (card_w + gap)
        pdf.set_fill_color(*card_bg)
        pdf.set_draw_color(*line)
        pdf.rect(x, y0, card_w, card_h, style="FD")
        # accent strip
        pdf.set_fill_color(*accent)
        pdf.rect(x, y0, 1.2, card_h, style="F")
        pdf.set_xy(x + 4, y0 + 4)
        pdf.set_font("Helvetica", size=8)
        pdf.set_text_color(*muted)
        pdf.cell(card_w - 6, 4, label.upper())
        pdf.set_xy(x + 4, y0 + 10)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(*ink)
        pdf.cell(card_w - 6, 7, value)
        pdf.set_xy(x + 4, y0 + 19)
        pdf.set_font("Helvetica", size=7)
        pdf.set_text_color(*muted)
        pdf.cell(card_w - 6, 4, hint)
    pdf.set_y(y0 + card_h + 10)

    # --- Weekday bars ---
    pdf.set_text_color(*ink)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(page_w, 7, "Time by weekday", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    max_weekday = max((w.duration_seconds for w in data.by_weekday), default=0) or 1
    bar_max_w = page_w - 42
    short_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i, row in enumerate(data.by_weekday):
        y = pdf.get_y()
        if y > pdf.h - 30:
            pdf.add_page()
            y = pdf.get_y()
        pdf.set_font("Helvetica", size=9)
        pdf.set_text_color(*ink)
        pdf.set_xy(pdf.l_margin, y)
        pdf.cell(18, 6, short_names[i])
        bar_w = bar_max_w * (row.duration_seconds / max_weekday)
        pdf.set_fill_color(*card_bg)
        pdf.rect(pdf.l_margin + 20, y + 1.2, bar_max_w, 3.6, style="F")
        if bar_w > 0:
            pdf.set_fill_color(*accent)
            pdf.rect(pdf.l_margin + 20, y + 1.2, max(bar_w, 0.8), 3.6, style="F")
        pdf.set_xy(pdf.l_margin + 20 + bar_max_w + 2, y)
        pdf.set_text_color(*muted)
        pdf.cell(20, 6, _fmt_hours(row.duration_seconds), align="R")
        pdf.set_y(y + 7)

    pdf.ln(6)

    # --- Weekly summary (compact) ---
    if data.by_week:
        pdf.set_text_color(*ink)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(page_w, 7, "Weekly totals", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        # table header
        pdf.set_fill_color(*band)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(page_w * 0.55, 7, "  Week starting", border=0, fill=True)
        pdf.cell(page_w * 0.45, 7, "Time  ", border=0, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=9)
        for idx, week in enumerate(data.by_week):
            if pdf.get_y() > pdf.h - 25:
                pdf.add_page()
            bg = zebra if idx % 2 else (255, 255, 255)
            pdf.set_fill_color(*bg)
            pdf.set_text_color(*ink)
            pdf.cell(page_w * 0.55, 6.5, f"  {week.week_start}", fill=True)
            pdf.set_text_color(*muted)
            pdf.cell(
                page_w * 0.45,
                6.5,
                f"{_fmt_hours(week.duration_seconds)}  ",
                fill=True,
                align="R",
                new_x="LMARGIN",
                new_y="NEXT",
            )
        pdf.ln(6)

    # --- Daily table ---
    pdf.set_text_color(*ink)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(page_w, 7, "Daily breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    if not data.days:
        pdf.set_font("Helvetica", size=10)
        pdf.set_text_color(*muted)
        pdf.cell(page_w, 8, "No location sessions in this period.")
    else:
        col_date = page_w * 0.40
        col_hours = page_w * 0.30
        col_bar = page_w * 0.30
        pdf.set_fill_color(*band)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(col_date, 7, "  Date", fill=True)
        pdf.cell(col_hours, 7, "Duration", fill=True, align="R")
        pdf.cell(col_bar, 7, "  Intensity", fill=True, new_x="LMARGIN", new_y="NEXT")

        max_day = max((d.duration_seconds for d in data.days), default=0) or 1
        pdf.set_font("Helvetica", size=9)
        for idx, day in enumerate(data.days):
            if pdf.get_y() > pdf.h - 22:
                pdf.add_page()
                pdf.set_fill_color(*band)
                pdf.set_text_color(255, 255, 255)
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(col_date, 7, "  Date", fill=True)
                pdf.cell(col_hours, 7, "Duration", fill=True, align="R")
                pdf.cell(col_bar, 7, "  Intensity", fill=True, new_x="LMARGIN", new_y="NEXT")
                pdf.set_font("Helvetica", size=9)

            bg = zebra if idx % 2 else (255, 255, 255)
            y = pdf.get_y()
            pdf.set_fill_color(*bg)
            pdf.rect(pdf.l_margin, y, page_w, 6.5, style="F")
            pdf.set_text_color(*ink)
            pdf.set_xy(pdf.l_margin, y)
            pdf.cell(col_date, 6.5, f"  {day.date}")
            pdf.set_text_color(*muted)
            pdf.cell(col_hours, 6.5, _fmt_hours(day.duration_seconds), align="R")
            # mini intensity bar
            intensity_w = (col_bar - 8) * (day.duration_seconds / max_day)
            bx = pdf.l_margin + col_date + col_hours + 4
            pdf.set_fill_color(*line)
            pdf.rect(bx, y + 2.0, col_bar - 8, 2.5, style="F")
            if intensity_w > 0:
                pdf.set_fill_color(*accent)
                pdf.rect(bx, y + 2.0, max(intensity_w, 0.6), 2.5, style="F")
            pdf.set_y(y + 6.5)

    # --- Footer on each page ---
    page_count = pdf.pages_count
    for page_n in range(1, page_count + 1):
        pdf.page = page_n
        pdf.set_y(-14)
        pdf.set_draw_color(*line)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.set_y(-12)
        pdf.set_font("Helvetica", size=8)
        pdf.set_text_color(*muted)
        pdf.cell(page_w * 0.5, 5, "Generated by BetterIntra")
        pdf.cell(page_w * 0.5, 5, f"Page {page_n} / {page_count}", align="R")

    out = pdf.output()
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return out.encode("latin-1")
