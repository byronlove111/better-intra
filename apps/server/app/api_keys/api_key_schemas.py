from datetime import datetime

from pydantic import BaseModel, Field


class CreateApiKeyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ApiKeyCreatedOut(BaseModel):
    """Returned once at creation — includes the raw key."""

    id: int
    name: str
    prefix: str
    key: str
    created_at: datetime


class ApiKeyOut(BaseModel):
    id: int
    name: str
    prefix: str
    created_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None
