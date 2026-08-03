"""In-memory WebSocket hub for DM push + global presence (single-process)."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket


@dataclass
class PresenceUser:
    user_id: int
    login: str | None
    display_name: str | None
    avatar_url: str | None


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._presence: dict[int, PresenceUser] = {}
        self._lock = asyncio.Lock()

    def online_users(self) -> list[PresenceUser]:
        return list(self._presence.values())

    def is_online(self, user_id: int) -> bool:
        return user_id in self._presence

    async def connect(self, websocket: WebSocket, user: PresenceUser) -> None:
        await websocket.accept()
        async with self._lock:
            first = user.user_id not in self._connections or not self._connections[user.user_id]
            self._connections[user.user_id].add(websocket)
            self._presence[user.user_id] = user
        # Snapshot for this socket
        await self._send(
            websocket,
            {
                "type": "presence.snapshot",
                "payload": {
                    "online": [
                        {
                            "id": p.user_id,
                            "login": p.login,
                            "display_name": p.display_name,
                            "avatar_url": p.avatar_url,
                            "is_online": True,
                        }
                        for p in self.online_users()
                    ]
                },
            },
        )
        if first:
            await self.broadcast_all(
                {
                    "type": "presence.online",
                    "payload": {
                        "id": user.user_id,
                        "login": user.login,
                        "display_name": user.display_name,
                        "avatar_url": user.avatar_url,
                        "is_online": True,
                    },
                },
                exclude_user_id=user.user_id,
            )

    async def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        went_offline = False
        presence: PresenceUser | None = None
        async with self._lock:
            sockets = self._connections.get(user_id)
            if sockets and websocket in sockets:
                sockets.discard(websocket)
            if sockets is not None and len(sockets) == 0:
                self._connections.pop(user_id, None)
                presence = self._presence.pop(user_id, None)
                went_offline = presence is not None
        if went_offline and presence is not None:
            await self.broadcast_all(
                {
                    "type": "presence.offline",
                    "payload": {
                        "id": presence.user_id,
                        "login": presence.login,
                        "display_name": presence.display_name,
                        "avatar_url": presence.avatar_url,
                        "is_online": False,
                    },
                }
            )

    async def broadcast_to_users(self, user_ids: list[int], event: dict[str, Any]) -> None:
        async with self._lock:
            targets = [ws for uid in user_ids for ws in self._connections.get(uid, set())]
        await asyncio.gather(*(self._send(ws, event) for ws in targets), return_exceptions=True)

    async def broadcast_all(self, event: dict[str, Any], *, exclude_user_id: int | None = None) -> None:
        async with self._lock:
            targets: list[WebSocket] = []
            for uid, sockets in self._connections.items():
                if exclude_user_id is not None and uid == exclude_user_id:
                    continue
                targets.extend(sockets)
        await asyncio.gather(*(self._send(ws, event) for ws in targets), return_exceptions=True)

    async def _send(self, websocket: WebSocket, event: dict[str, Any]) -> None:
        try:
            await websocket.send_text(json.dumps(event, default=str))
        except Exception:
            # Drop silently; disconnect handler cleans up
            return


ws_manager = ConnectionManager()
