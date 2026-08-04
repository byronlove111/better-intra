"""In-memory WebSocket hub for DM push + follow-scoped presence (single-process)."""

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

    def online_among(self, user_ids: set[int] | list[int]) -> list[PresenceUser]:
        allowed = set(user_ids)
        return [p for p in self._presence.values() if p.user_id in allowed]

    @staticmethod
    def presence_payload(user: PresenceUser, *, is_online: bool) -> dict[str, Any]:
        return {
            "id": user.user_id,
            "login": user.login,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "is_online": is_online,
        }

    async def connect(self, websocket: WebSocket, user: PresenceUser) -> bool:
        """Accept socket and mark online. Returns True if this is the user's first socket."""
        await websocket.accept()
        async with self._lock:
            first = user.user_id not in self._connections or not self._connections[user.user_id]
            self._connections[user.user_id].add(websocket)
            self._presence[user.user_id] = user
        return first

    async def send_presence_snapshot(self, websocket: WebSocket, online: list[PresenceUser]) -> None:
        await self._send(
            websocket,
            {
                "type": "presence.snapshot",
                "payload": {
                    "online": [self.presence_payload(p, is_online=True) for p in online],
                },
            },
        )

    async def announce_online(self, user: PresenceUser, *, to_user_ids: list[int]) -> None:
        if not to_user_ids:
            return
        await self.broadcast_to_users(
            to_user_ids,
            {
                "type": "presence.online",
                "payload": self.presence_payload(user, is_online=True),
            },
        )

    async def disconnect(
        self,
        websocket: WebSocket,
        user_id: int,
        *,
        announce_to: list[int] | None = None,
    ) -> None:
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
        if went_offline and presence is not None and announce_to:
            await self.broadcast_to_users(
                announce_to,
                {
                    "type": "presence.offline",
                    "payload": self.presence_payload(presence, is_online=False),
                },
            )

    async def broadcast_to_users(self, user_ids: list[int], event: dict[str, Any]) -> None:
        async with self._lock:
            targets = [ws for uid in user_ids for ws in self._connections.get(uid, set())]
        await asyncio.gather(*(self._send(ws, event) for ws in targets), return_exceptions=True)

    async def _send(self, websocket: WebSocket, event: dict[str, Any]) -> None:
        try:
            await websocket.send_text(json.dumps(event, default=str))
        except Exception:
            # Drop silently; disconnect handler cleans up
            return


ws_manager = ConnectionManager()
