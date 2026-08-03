from datetime import UTC, datetime

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.chat.block_model import UserBlock
from app.chat.conversation_model import Conversation
from app.chat.conversation_read_model import ConversationRead
from app.chat.message_model import Message


def ordered_pair(user_id: int, other_id: int) -> tuple[int, int]:
    return (user_id, other_id) if user_id < other_id else (other_id, user_id)


def get_conversation_by_id(db: Session, conversation_id: int) -> Conversation | None:
    return db.get(Conversation, conversation_id)


def get_conversation_for_pair(db: Session, user_a: int, user_b: int) -> Conversation | None:
    low, high = ordered_pair(user_a, user_b)
    return db.scalar(
        select(Conversation).where(Conversation.user_low_id == low, Conversation.user_high_id == high)
    )


def get_or_create_conversation(db: Session, user_a: int, user_b: int) -> Conversation:
    existing = get_conversation_for_pair(db, user_a, user_b)
    if existing is not None:
        return existing
    low, high = ordered_pair(user_a, user_b)
    row = Conversation(user_low_id=low, user_high_id=high)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_conversations_for_user(db: Session, user_id: int) -> list[Conversation]:
    return list(
        db.scalars(
            select(Conversation)
            .where(or_(Conversation.user_low_id == user_id, Conversation.user_high_id == user_id))
            .order_by(Conversation.updated_at.desc())
        ).all()
    )


def create_message(db: Session, *, conversation_id: int, sender_id: int, body: str) -> Message:
    msg = Message(conversation_id=conversation_id, sender_id=sender_id, body=body)
    db.add(msg)
    conv = db.get(Conversation, conversation_id)
    if conv is not None:
        conv.updated_at = datetime.now(UTC)
        db.add(conv)
    db.commit()
    db.refresh(msg)
    return msg


def get_message(db: Session, message_id: int) -> Message | None:
    return db.get(Message, message_id)


def latest_message(db: Session, conversation_id: int) -> Message | None:
    return db.scalar(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .limit(1)
    )


def list_messages(
    db: Session,
    *,
    conversation_id: int,
    before_id: int | None,
    limit: int,
) -> list[Message]:
    stmt = select(Message).where(Message.conversation_id == conversation_id)
    if before_id is not None:
        stmt = stmt.where(Message.id < before_id)
    stmt = stmt.order_by(Message.id.desc()).limit(limit)
    rows = list(db.scalars(stmt).all())
    rows.reverse()  # chronological for the client
    return rows


def get_read(db: Session, *, conversation_id: int, user_id: int) -> ConversationRead | None:
    return db.scalar(
        select(ConversationRead).where(
            ConversationRead.conversation_id == conversation_id,
            ConversationRead.user_id == user_id,
        )
    )


def upsert_read(
    db: Session,
    *,
    conversation_id: int,
    user_id: int,
    last_read_message_id: int | None,
) -> ConversationRead:
    row = get_read(db, conversation_id=conversation_id, user_id=user_id)
    now = datetime.now(UTC)
    if row is None:
        row = ConversationRead(
            conversation_id=conversation_id,
            user_id=user_id,
            last_read_message_id=last_read_message_id,
            last_read_at=now,
        )
    else:
        # Only move cursor forward
        if last_read_message_id is not None and (
            row.last_read_message_id is None or last_read_message_id > row.last_read_message_id
        ):
            row.last_read_message_id = last_read_message_id
            row.last_read_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def unread_count(db: Session, *, conversation_id: int, user_id: int) -> int:
    read = get_read(db, conversation_id=conversation_id, user_id=user_id)
    last_id = read.last_read_message_id if read else None
    stmt = select(func.count()).select_from(Message).where(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,
    )
    if last_id is not None:
        stmt = stmt.where(Message.id > last_id)
    return int(db.scalar(stmt) or 0)


def is_blocked_either_way(db: Session, user_a: int, user_b: int) -> bool:
    return (
        db.scalar(
            select(UserBlock.id).where(
                or_(
                    and_(UserBlock.blocker_id == user_a, UserBlock.blocked_id == user_b),
                    and_(UserBlock.blocker_id == user_b, UserBlock.blocked_id == user_a),
                )
            )
        )
        is not None
    )


def get_block(db: Session, *, blocker_id: int, blocked_id: int) -> UserBlock | None:
    return db.scalar(
        select(UserBlock).where(UserBlock.blocker_id == blocker_id, UserBlock.blocked_id == blocked_id)
    )


def create_block(db: Session, *, blocker_id: int, blocked_id: int) -> UserBlock:
    row = UserBlock(blocker_id=blocker_id, blocked_id=blocked_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_block(db: Session, row: UserBlock) -> None:
    db.delete(row)
    db.commit()


def list_blocks(db: Session, *, blocker_id: int) -> list[UserBlock]:
    return list(
        db.scalars(
            select(UserBlock).where(UserBlock.blocker_id == blocker_id).order_by(UserBlock.created_at.desc())
        ).all()
    )
