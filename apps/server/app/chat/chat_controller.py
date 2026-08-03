from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.chat import chat_service
from app.chat.chat_schemas import (
    BlockOut,
    ConversationOut,
    MarkReadRequest,
    MessageOut,
    MessagesPage,
    PresenceOut,
    ReadOut,
    SendMessageRequest,
)
from app.deps import get_db, require_intra_linked
from app.users.user_model import User

router = APIRouter(tags=["chat"])


@router.get(
    "/conversations",
    response_model=list[ConversationOut],
    summary="List my DM conversations",
)
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> list[ConversationOut]:
    return chat_service.list_conversations(db, me=current_user)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationOut,
    summary="Get a conversation",
)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> ConversationOut:
    return chat_service.get_conversation(db, me=current_user, conversation_id=conversation_id)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessagesPage,
    summary="List messages (cursor pagination)",
    description="Returns up to `limit` messages oldest→newest. Pass `before_id` for older pages.",
)
def list_messages(
    conversation_id: int,
    before_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> MessagesPage:
    return chat_service.list_messages(
        db,
        me=current_user,
        conversation_id=conversation_id,
        before_id=before_id,
        limit=limit,
    )


@router.post(
    "/conversations/{conversation_id}/read",
    response_model=ReadOut,
    summary="Mark conversation as read",
    description="Instagram-style: call when the user opens the conversation. Defaults to latest message.",
)
async def mark_read(
    conversation_id: int,
    body: MarkReadRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> ReadOut:
    return await chat_service.mark_read(
        db,
        me=current_user,
        conversation_id=conversation_id,
        data=body or MarkReadRequest(),
    )


@router.post(
    "/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Send a DM",
    description=(
        "Creates the 1:1 thread on first message. Both users must have BetterIntra + Intra linked. "
        "Blocked pairs cannot message."
    ),
)
async def send_message(
    body: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> MessageOut:
    return await chat_service.send_message(db, me=current_user, data=body)


@router.get(
    "/blocks",
    response_model=list[BlockOut],
    summary="List users I blocked",
)
def list_blocks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> list[BlockOut]:
    return chat_service.list_blocks(db, me=current_user)


@router.post(
    "/blocks/{login}",
    response_model=BlockOut,
    status_code=status.HTTP_201_CREATED,
    summary="Block a user",
    description="Blocks messaging both ways between you and this login.",
)
def block_user(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> BlockOut:
    return chat_service.block_user(db, me=current_user, login=login)


@router.delete(
    "/blocks/{login}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unblock a user",
)
def unblock_user(
    login: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_intra_linked),
) -> Response:
    chat_service.unblock_user(db, me=current_user, login=login)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/presence",
    response_model=PresenceOut,
    summary="Currently online BetterIntra users",
    description="Users with an active WebSocket. Also pushed live via WS presence.* events.",
)
def get_presence(
    _current_user: User = Depends(require_intra_linked),
) -> PresenceOut:
    return chat_service.presence_snapshot()
