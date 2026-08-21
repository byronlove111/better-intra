from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class AgendaSource(StrEnum):
    intra = "intra"
    betterintra = "betterintra"


class AgendaCreatorOut(BaseModel):
    """BetterIntra event creator (for profile / DM links)."""

    id: int
    login: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    is_intra_linked: bool = False


class AgendaEventOut(BaseModel):
    """Normalized calendar item across Intra + BetterIntra (extra sources later)."""

    id: str = Field(description='Composite id, e.g. "intra:42" or "betterintra:1"')
    source: AgendaSource
    external_id: str = Field(description="Raw id in the source system")
    title: str
    description: str | None = None
    location: str | None = None
    begin_at: datetime | None = None
    end_at: datetime | None = None
    url: str | None = None
    kind: str | None = Field(default=None, description="Intra kind / optional category")
    creator_id: int | None = Field(default=None, description="BetterIntra creator when source=betterintra")
    creator: AgendaCreatorOut | None = Field(
        default=None,
        description="Creator profile snippet when source=betterintra",
    )
    can_edit: bool = False


class AgendaOut(BaseModel):
    items: list[AgendaEventOut]
    sources_included: list[AgendaSource]
    meta: dict = Field(
        default_factory=dict,
        description="Pagination/filter metadata (limit, offset, total_returned, …)",
    )
