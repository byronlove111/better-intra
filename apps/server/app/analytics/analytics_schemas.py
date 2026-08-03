from datetime import datetime

from pydantic import BaseModel, Field


class LogtimeDayStat(BaseModel):
    date: str
    duration_seconds: int
    duration_hours: float


class LogtimeWeekdayStat(BaseModel):
    weekday: int = Field(description="0=Monday … 6=Sunday")
    weekday_name: str
    duration_seconds: int
    duration_hours: float


class LogtimeWeekStat(BaseModel):
    week_start: str
    duration_seconds: int
    duration_hours: float


class LogtimeAnalyticsOut(BaseModel):
    login: str
    begin_at: datetime
    end_at: datetime
    total_seconds: int
    total_hours: float
    active_days: int
    average_seconds_per_active_day: int
    average_hours_per_active_day: float
    sessions_count: int
    days: list[LogtimeDayStat] = Field(default_factory=list)
    by_weekday: list[LogtimeWeekdayStat] = Field(default_factory=list)
    by_week: list[LogtimeWeekStat] = Field(default_factory=list)
