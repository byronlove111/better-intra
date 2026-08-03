from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=255)
    begin_at: datetime
    end_at: datetime

    @model_validator(mode="after")
    def end_after_begin(self) -> EventCreate:
        if self.end_at <= self.begin_at:
            raise ValueError("end_at must be after begin_at")
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=255)
    begin_at: datetime | None = None
    end_at: datetime | None = None

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
    begin_at: datetime
    end_at: datetime
    created_at: datetime
    updated_at: datetime
