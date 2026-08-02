from datetime import datetime

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
