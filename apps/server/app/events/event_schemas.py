from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator


def _empty_str_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _require_http_url(value: object) -> object:
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    cleaned = _empty_str_to_none(value)
    if cleaned is None:
        return None
    if not cleaned.startswith(("http://", "https://")):
        raise ValueError("url must start with http:// or https://")
    return cleaned


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=255)
    url: str | None = Field(default=None, max_length=2048)
    begin_at: datetime
    end_at: datetime

    @field_validator("description", "location", mode="before")
    @classmethod
    def blank_optional_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            return _empty_str_to_none(value)
        return value

    @field_validator("url", mode="before")
    @classmethod
    def validate_url(cls, value: object) -> object:
        return _require_http_url(value)

    @model_validator(mode="after")
    def end_after_begin(self) -> EventCreate:
        if self.end_at <= self.begin_at:
            raise ValueError("end_at must be after begin_at")
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=255)
    url: str | None = Field(default=None, max_length=2048)
    begin_at: datetime | None = None
    end_at: datetime | None = None

    @field_validator("description", "location", mode="before")
    @classmethod
    def blank_optional_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            return _empty_str_to_none(value)
        return value

    @field_validator("url", mode="before")
    @classmethod
    def validate_url(cls, value: object) -> object:
        return _require_http_url(value)

    @model_validator(mode="after")
    def end_after_begin_when_both(self) -> EventUpdate:
        if self.begin_at is not None and self.end_at is not None and self.end_at <= self.begin_at:
            raise ValueError("end_at must be after begin_at")
        return self


class EventOut(BaseModel):
    id: int
    creator_id: int
    title: str
    description: str | None
    location: str | None
    url: str | None
    begin_at: datetime
    end_at: datetime
    created_at: datetime
    updated_at: datetime
