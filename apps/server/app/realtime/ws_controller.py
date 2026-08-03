import jwt
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth.auth_service import decode_access_token
from app.db import SessionLocal
from app.realtime.ws_manager import PresenceUser, ws_manager
from app.users import user_repository

router = APIRouter(tags=["realtime"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None, description="JWT access token"),
) -> None:
    """Realtime channel: message.created, conversation.read, presence.* (no typing).

    Auth: `ws://host/ws?token=<access_jwt>`
    """
    if not token:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        try:
            payload = decode_access_token(token)
            user_id = int(payload["sub"])
        except (jwt.PyJWTError, KeyError, ValueError):
            await websocket.close(code=4401)
            return

        user = user_repository.get_by_id(db, user_id)
        if user is None or not user.is_intra_linked():
            await websocket.close(code=4403)
            return

        presence = PresenceUser(
            user_id=user.id,
            login=user.login,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        )
    finally:
        db.close()

    await ws_manager.connect(websocket, presence)
    try:
        while True:
            # Keepalive / ignore client payloads (no typing). Ping frames handled by ASGI.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket, presence.user_id)
