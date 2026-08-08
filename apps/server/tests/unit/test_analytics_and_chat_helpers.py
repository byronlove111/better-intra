"""Unit tests — chat helpers + analytics aggregation (no HTTP)."""

from datetime import UTC, datetime, timedelta

from app.analytics.analytics_service import analytics_to_csv, build_analytics
from app.chat.chat_repository import ordered_pair


def test_ordered_pair_is_stable() -> None:
    assert ordered_pair(5, 2) == (2, 5)
    assert ordered_pair(2, 5) == (2, 5)
    assert ordered_pair(3, 3) == (3, 3)


def test_build_analytics_aggregates_by_day_and_weekday() -> None:
    begin = datetime(2026, 3, 2, tzinfo=UTC)  # Monday
    end = begin + timedelta(days=7)
    locations = [
        {
            "id": 1,
            "begin_at": "2026-03-02T09:00:00.000Z",
            "end_at": "2026-03-02T11:00:00.000Z",
            "host": "e1r1p1",
            "campus_id": 1,
        },
        {
            "id": 2,
            "begin_at": "2026-03-03T10:00:00.000Z",
            "end_at": "2026-03-03T12:30:00.000Z",
            "host": "e1r1p2",
            "campus_id": 1,
        },
    ]

    data = build_analytics(login="alice", begin_at=begin, end_at=end, locations=locations)

    assert data.login == "alice"
    assert data.sessions_count == 2
    assert data.total_seconds == 2 * 3600 + int(2.5 * 3600)
    assert data.active_days == 2
    assert data.days[0].date == "2026-03-02"
    assert data.days[0].duration_seconds == 7200
    assert data.by_weekday[0].weekday_name == "Monday"
    assert data.by_weekday[0].duration_seconds == 7200
    assert data.by_weekday[1].duration_seconds == 9000


def test_analytics_to_csv_contains_totals() -> None:
    begin = datetime(2026, 3, 2, tzinfo=UTC)
    end = begin + timedelta(days=1)
    data = build_analytics(
        login="bob",
        begin_at=begin,
        end_at=end,
        locations=[
            {
                "id": 1,
                "begin_at": "2026-03-02T09:00:00.000Z",
                "end_at": "2026-03-02T10:00:00.000Z",
                "host": "e1r1p1",
                "campus_id": 1,
            }
        ],
    )
    csv_text = analytics_to_csv(data)
    assert "bob" in csv_text
    assert "total_seconds" in csv_text or "3600" in csv_text
