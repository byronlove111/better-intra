from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.chat import chat_repository
from app.chat.chat_schemas import (
    BlockOut,
    ConversationOut,
    MarkReadRequest,
    MessageOut,
    MessagesPage,
    PeerOut,
    PresenceOut,
    ReadOut,
    SendMessageRequest,
)
from app.chat.conversation_model import Conversation
from app.chat.message_model import Message
from app.friends import friend_repository
from app.realtime.ws_manager import ws_manager
from app.users import user_repository
from app.users.user_model import User


def _resolve_peer_by_login(db: Session, login: str) -> User | None:
    raw = login.strip()
    if not raw:
        return None
    return user_repository.get_by_login(db, raw) or user_repository.get_by_login(db, raw.lower())


def _peer_out(user: User) -> PeerOut:
    return PeerOut(
        id=user.id,
        login=user.login or "",
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        is_online=ws_manager.is_online(user.id),
    )


def _message_out(msg: Message) -> MessageOut:
    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        body=msg.body,
        created_at=msg.created_at,
    )


def _other_user_id(conv: Conversation, me_id: int) -> int:
    return conv.user_high_id if conv.user_low_id == me_id else conv.user_low_id


def _require_member(conv: Conversation, user_id: int) -> None:
    if user_id not in (conv.user_low_id, conv.user_high_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


def _require_intra_user(user: User, *, detail: str) -> None:
    if not user.is_intra_linked() or not user.login:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _conversation_out(db: Session, *, conv: Conversation, me: User) -> ConversationOut:
    peer_id = _other_user_id(conv, me.id)
    peer = user_repository.get_by_id(db, peer_id)
    if peer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Peer not found")

    last = chat_repository.latest_message(db, conv.id)
    my_read = chat_repository.get_read(db, conversation_id=conv.id, user_id=me.id)
    peer_read = chat_repository.get_read(db, conversation_id=conv.id, user_id=peer_id)
    return ConversationOut(
        id=conv.id,
        peer=_peer_out(peer),
        last_message=_message_out(last) if last else None,
        unread_count=chat_repository.unread_count(db, conversation_id=conv.id, user_id=me.id),
        last_read_message_id=my_read.last_read_message_id if my_read else None,
        peer_last_read_message_id=peer_read.last_read_message_id if peer_read else None,
        updated_at=conv.updated_at,
        created_at=conv.created_at,
    )


def list_conversations(db: Session, *, me: User) -> list[ConversationOut]:
    convs = chat_repository.list_conversations_for_user(db, me.id)
    return [_conversation_out(db, conv=c, me=me) for c in convs]


def get_conversation(db: Session, *, me: User, conversation_id: int) -> ConversationOut:
    conv = chat_repository.get_conversation_by_id(db, conversation_id)
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    _require_member(conv, me.id)
    return _conversation_out(db, conv=conv, me=me)


async def send_message(db: Session, *, me: User, data: SendMessageRequest) -> MessageOut:
    _require_intra_user(me, detail="Link your Intra account first")

    peer = _resolve_peer_by_login(db, data.to_login)
    if peer is None or not peer.is_intra_linked():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or has no BetterIntra account with Intra linked",
        )
    if peer.id == me.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot message yourself")

    if chat_repository.is_blocked_either_way(db, me.id, peer.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Messaging blocked between these users")

    body = data.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Message body is empty")

    conv = chat_repository.get_or_create_conversation(db, me.id, peer.id)
    msg = chat_repository.create_message(db, conversation_id=conv.id, sender_id=me.id, body=body)
    chat_repository.upsert_read(
        db,
        conversation_id=conv.id,
        user_id=me.id,
        last_read_message_id=msg.id,
    )

    out = _message_out(msg)
    await ws_manager.broadcast_to_users(
        [me.id, peer.id],
        {"type": "message.created", "payload": out.model_dump(mode="json")},
    )

    preview = body if len(body) <= 120 else f"{body[:117]}..."
    from app.notifications.notification_schemas import NotificationType
    from app.notifications.notification_service import notify

    await notify(
        db,
        user_id=peer.id,
        type=NotificationType.dm,
        body=f"{me.login}: {preview}",
        url=f"/conversations/{conv.id}",
    )
    return out


def list_messages(
    db: Session,
    *,
    me: User,
    conversation_id: int,
    before_id: int | None,
    limit: int,
) -> MessagesPage:
    conv = chat_repository.get_conversation_by_id(db, conversation_id)
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    _require_member(conv, me.id)

    batch = chat_repository.list_messages(
        db,
        conversation_id=conversation_id,
        before_id=before_id,
        limit=limit + 1,
    )
    has_more = len(batch) > limit
    # batch is chronological (oldest → newest). Extra row is the oldest when has_more.
    items = batch[1:] if has_more else batch
    return MessagesPage(items=[_message_out(m) for m in items], has_more=has_more)


async def mark_read(
    db: Session,
    *,
    me: User,
    conversation_id: int,
    data: MarkReadRequest,
) -> ReadOut:
    conv = chat_repository.get_conversation_by_id(db, conversation_id)
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    _require_member(conv, me.id)

    target_id = data.message_id
    if target_id is None:
        latest = chat_repository.latest_message(db, conversation_id)
        target_id = latest.id if latest else None
    else:
        msg = chat_repository.get_message(db, target_id)
        if msg is None or msg.conversation_id != conversation_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    row = chat_repository.upsert_read(
        db,
        conversation_id=conversation_id,
        user_id=me.id,
        last_read_message_id=target_id,
    )
    out = ReadOut(
        conversation_id=conversation_id,
        user_id=me.id,
        last_read_message_id=row.last_read_message_id,
        last_read_at=row.last_read_at,
    )
    peer_id = _other_user_id(conv, me.id)
    await ws_manager.broadcast_to_users(
        [me.id, peer_id],
        {"type": "conversation.read", "payload": out.model_dump(mode="json")},
    )
    return out


def block_user(db: Session, *, me: User, login: str) -> BlockOut:
    peer = _resolve_peer_by_login(db, login)
    if peer is None or not peer.is_intra_linked():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if peer.id == me.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")

    existing = chat_repository.get_block(db, blocker_id=me.id, blocked_id=peer.id)
    if existing is not None:
        return BlockOut(id=existing.id, blocked_user=_peer_out(peer), created_at=existing.created_at)

    row = chat_repository.create_block(db, blocker_id=me.id, blocked_id=peer.id)
    return BlockOut(id=row.id, blocked_user=_peer_out(peer), created_at=row.created_at)


def unblock_user(db: Session, *, me: User, login: str) -> None:
    peer = _resolve_peer_by_login(db, login)
    if peer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    row = chat_repository.get_block(db, blocker_id=me.id, blocked_id=peer.id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    chat_repository.delete_block(db, row)


def list_blocks(db: Session, *, me: User) -> list[BlockOut]:
    rows = chat_repository.list_blocks(db, blocker_id=me.id)
    out: list[BlockOut] = []
    for row in rows:
        peer = user_repository.get_by_id(db, row.blocked_id)
        if peer is None:
            continue
        out.append(BlockOut(id=row.id, blocked_user=_peer_out(peer), created_at=row.created_at))
    return out


def presence_snapshot(db: Session, *, user: User) -> PresenceOut:
    """Online BetterIntra users among people the caller follows."""
    following_ids = friend_repository.list_following_user_ids(db, follower_id=user.id)
    return PresenceOut(
        online=[
            PeerOut(
                id=p.user_id,
                login=p.login or "",
                display_name=p.display_name,
                avatar_url=p.avatar_url,
                is_online=True,
            )
            for p in ws_manager.online_among(following_ids)
        ]
    )
