from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class IntraCampusOut(BaseModel):
    id: int | None = None
    name: str | None = None
    city: str | None = None
    country: str | None = None


class IntraCursusOut(BaseModel):
    id: int | None = None
    name: str | None = None
    slug: str | None = None
    grade: str | None = None
    level: float | None = None
    begin_at: datetime | None = None
    end_at: datetime | None = None
    blackholed_at: datetime | None = None


class IntraProfileOut(BaseModel):
    id: int
    login: str
    email: str | None = None
    displayname: str | None = None
    wallet: int | None = None
    correction_point: int | None = None
    location: str | None = None
    pool_month: str | None = None
    pool_year: str | None = None
    avatar_url: str | None = None
    campus: list[IntraCampusOut] = Field(default_factory=list)
    cursus: list[IntraCursusOut] = Field(default_factory=list)


class IntraProjectOut(BaseModel):
    id: int
    status: str | None = None
    final_mark: int | None = None
    validated: bool | None = None
    marked_at: datetime | None = None
    project_id: int | None = None
    project_name: str | None = None
    project_slug: str | None = None
    cursus_ids: list[int] = Field(default_factory=list)
    updated_at: datetime | None = None


class IntraEventOut(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    location: str | None = None
    kind: str | None = None
    max_people: int | None = None
    nbr_subscribers: int | None = None
    begin_at: datetime | None = None
    end_at: datetime | None = None
    campus_ids: list[int] = Field(default_factory=list)
    cursus_ids: list[int] = Field(default_factory=list)


class IntraEvaluationFeedbackDetailOut(BaseModel):
    kind: str | None = None
    rate: int | None = None


class IntraEvaluationFeedbackOut(BaseModel):
    """Note que l'évalué donne à l'évaluateur (Intra feedbacks on the scale_team)."""

    from_login: str | None = None
    rating: int | None = Field(default=None, description="Overall rating (typically 0–5)")
    comment: str | None = None
    details: list[IntraEvaluationFeedbackDetailOut] = Field(
        default_factory=list,
        description="Per-kind rates (nice, rigorous, interested, punctuality, …)",
    )


class IntraEvaluationOut(BaseModel):
    id: int
    role: Literal["corrector", "corrected"]
    begin_at: datetime | None = None
    final_mark: int | None = None
    comment: str | None = Field(default=None, description="Corrector's comment on the defence")
    project_name: str | None = None
    project_slug: str | None = None
    project_id: int | None = None
    corrector_login: str | None = None
    corrected_logins: list[str] = Field(default_factory=list)
    feedbacks: list[IntraEvaluationFeedbackOut] = Field(
        default_factory=list,
        description=(
            "Feedbacks from corrected users toward the corrector "
            "(rating + comment from the scale_teams list payload; "
            "per-kind details are often empty unless fetched separately)."
        ),
    )


class IntraLocationSessionOut(BaseModel):
    id: int
    begin_at: datetime | None = None
    end_at: datetime | None = None
    host: str | None = None
    campus_id: int | None = None
    duration_seconds: int | None = None


class IntraLogtimeDayOut(BaseModel):
    date: str
    duration_seconds: int


class IntraLogtimeOut(BaseModel):
    begin_at: datetime | None = None
    end_at: datetime | None = None
    total_seconds: int
    days: list[IntraLogtimeDayOut] = Field(default_factory=list)
    sessions: list[IntraLocationSessionOut] = Field(default_factory=list)


class IntraUserSummaryOut(BaseModel):
    id: int
    login: str
    displayname: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    pool_month: str | None = None
    pool_year: str | None = None
    kind: str | None = None


class IntraUserProfileOut(IntraUserSummaryOut):
    wallet: int | None = None
    correction_point: int | None = None
    campus: list[IntraCampusOut] = Field(default_factory=list)
    cursus: list[IntraCursusOut] = Field(default_factory=list)


class IntraPageMeta(BaseModel):
    page: int
    page_size: int
    total: int | None = None


class IntraProjectsPage(BaseModel):
    items: list[IntraProjectOut]
    meta: IntraPageMeta


class IntraEventsPage(BaseModel):
    items: list[IntraEventOut]
    meta: IntraPageMeta


class IntraEvaluationsPage(BaseModel):
    items: list[IntraEvaluationOut]
    meta: IntraPageMeta


class IntraUsersPage(BaseModel):
    items: list[IntraUserSummaryOut]
    meta: IntraPageMeta
