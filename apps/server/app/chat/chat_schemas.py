from datetime import datetime

from pydantic import BaseModel, Field


class PeerOut(BaseModel):
    id: int
    login: str
    display_name: str | None = None
    avatar_url: str | None = None
    is_online: bool = False


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: str
    created_at: datetime


class SendMessageRequest(BaseModel):
    to_login: str = Field(min_length=1, max_length=64)
    body: str = Field(min_length=1, max_length=2000)


class ConversationOut(BaseModel):
    id: int
    peer: PeerOut
    last_message: MessageOut | None = None
    unread_count: int = 0
    last_read_message_id: int | None = None
    peer_last_read_message_id: int | None = None
    updated_at: datetime
    created_at: datetime


class MessagesPage(BaseModel):
    items: list[MessageOut]
    has_more: bool


class MarkReadRequest(BaseModel):
    message_id: int | None = Field(
        default=None,
        description="Defaults to the latest message in the conversation",
    )


class ReadOut(BaseModel):
    conversation_id: int
    user_id: int
    last_read_message_id: int | None
    last_read_at: datetime


class BlockOut(BaseModel):
    id: int
    blocked_user: PeerOut
    created_at: datetime


class PresenceOut(BaseModel):
    online: list[PeerOut]
