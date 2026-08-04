import jwt
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth.auth_service import decode_access_token
from app.db import SessionLocal
from app.friends import friend_repository
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

    Presence is follow-scoped: snapshot = online people you follow;
    online/offline events go only to your followers.
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
        if user is None or not user.is_intra_linked() or user.forty_two_id is None:
            await websocket.close(code=4403)
            return

        presence = PresenceUser(
            user_id=user.id,
            login=user.login,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        )
        following_user_ids = friend_repository.list_following_user_ids(db, follower_id=user.id)
        follower_user_ids = friend_repository.list_follower_user_ids(
            db, following_forty_two_id=int(user.forty_two_id)
        )
    finally:
        db.close()

    first = await ws_manager.connect(websocket, presence)
    await ws_manager.send_presence_snapshot(
        websocket,
        ws_manager.online_among(following_user_ids),
    )
    if first:
        await ws_manager.announce_online(presence, to_user_ids=follower_user_ids)

    try:
        while True:
            # Keepalive / ignore client payloads (no typing). Ping frames handled by ASGI.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        db = SessionLocal()
        try:
            u = user_repository.get_by_id(db, presence.user_id)
            announce_to = (
                friend_repository.list_follower_user_ids(db, following_forty_two_id=int(u.forty_two_id))
                if u is not None and u.forty_two_id is not None
                else []
            )
        finally:
            db.close()
        await ws_manager.disconnect(websocket, presence.user_id, announce_to=announce_to)
