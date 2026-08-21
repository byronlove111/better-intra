"""GDPR account erasure: wipe all BetterIntra data tied to a user."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.api_keys.api_key_model import ApiKey
from app.chat.block_model import UserBlock
from app.chat.conversation_model import Conversation
from app.chat.conversation_read_model import ConversationRead
from app.chat.message_model import Message
from app.events.event_model import Event
from app.friends.friend_model import Friendship
from app.intra.intra_person_model import IntraPerson
from app.media.media_service import delete_user_media
from app.notifications.notification_model import Notification
from app.users.user_model import User


@dataclass(frozen=True)
class ErasureSummary:
    api_keys: int
    events: int
    notifications: int
    friendships: int
    blocks: int
    messages: int
    conversation_reads: int
    conversations: int
    user: int


def erase_user_data(db: Session, user: User) -> ErasureSummary:
    """Delete every BetterIntra row linked to `user`, including OAuth tokens.

    Intra directory rows (`intra_people`) are kept but unlinked (SET NULL), so
    other students can still follow the 42 identity without a BI account.
    """
    user_id = user.id

    # Wipe secrets first so a partial failure never leaves usable tokens.
    user.forty_two_access_token = None
    user.forty_two_refresh_token = None
    user.forty_two_token_expires_at = None
    user.password_hash = ""
    db.add(user)
    db.flush()

    api_keys = db.execute(delete(ApiKey).where(ApiKey.user_id == user_id)).rowcount or 0
    events = db.execute(delete(Event).where(Event.creator_id == user_id)).rowcount or 0
    notifications = (
        db.execute(delete(Notification).where(Notification.user_id == user_id)).rowcount or 0
    )
    friendships = (
        db.execute(delete(Friendship).where(Friendship.follower_id == user_id)).rowcount or 0
    )
    blocks = (
        db.execute(
            delete(UserBlock).where(
                or_(UserBlock.blocker_id == user_id, UserBlock.blocked_id == user_id)
            )
        ).rowcount
        or 0
    )

    conversation_ids = list(
        db.scalars(
            select(Conversation.id).where(
                or_(Conversation.user_low_id == user_id, Conversation.user_high_id == user_id)
            )
        ).all()
    )

    messages = 0
    conversation_reads = 0
    conversations = 0
    if conversation_ids:
        conversation_reads = (
            db.execute(
                delete(ConversationRead).where(
                    or_(
                        ConversationRead.conversation_id.in_(conversation_ids),
                        ConversationRead.user_id == user_id,
                    )
                )
            ).rowcount
            or 0
        )
        messages = (
            db.execute(
                delete(Message).where(
                    or_(
                        Message.conversation_id.in_(conversation_ids),
                        Message.sender_id == user_id,
                    )
                )
            ).rowcount
            or 0
        )
        conversations = (
            db.execute(delete(Conversation).where(Conversation.id.in_(conversation_ids))).rowcount
            or 0
        )
    else:
        conversation_reads = (
            db.execute(delete(ConversationRead).where(ConversationRead.user_id == user_id)).rowcount
            or 0
        )
        messages = (
            db.execute(delete(Message).where(Message.sender_id == user_id)).rowcount or 0
        )

    db.execute(
        update(IntraPerson)
        .where(IntraPerson.betterintra_user_id == user_id)
        .values(betterintra_user_id=None)
    )

    delete_user_media(user_id)

    deleted_user = db.execute(delete(User).where(User.id == user_id)).rowcount or 0
    db.commit()

    return ErasureSummary(
        api_keys=api_keys,
        events=events,
        notifications=notifications,
        friendships=friendships,
        blocks=blocks,
        messages=messages,
        conversation_reads=conversation_reads,
        conversations=conversations,
        user=deleted_user,
    )
