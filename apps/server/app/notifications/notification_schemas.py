from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class NotificationType(StrEnum):
    dm = "dm"
    follow = "follow"
    event = "event"
    announcement = "announcement"


class NotificationOut(BaseModel):
    id: int
    type: NotificationType
    body: str
    url: str = Field(description="Front path to open when clicked, e.g. /conversations/1")
    created_at: datetime


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
