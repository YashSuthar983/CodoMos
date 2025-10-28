from __future__ import annotations
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_users: Dict[str, Set[WebSocket]] = {}
        self.channels: Dict[str, Set[WebSocket]] = {}

    async def connect_user(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_users.setdefault(user_id, set()).add(websocket)

    def disconnect_user(self, user_id: str, websocket: WebSocket) -> None:
        if user_id in self.active_users:
            self.active_users[user_id].discard(websocket)
            if not self.active_users[user_id]:
                del self.active_users[user_id]

    async def send_to_user(self, user_id: str, data: dict) -> None:
        for ws in self.active_users.get(user_id, set()):
            await ws.send_json(data)

    async def join_channel(self, channel_id: str, websocket: WebSocket) -> None:
        self.channels.setdefault(channel_id, set()).add(websocket)

    def leave_channel(self, channel_id: str, websocket: WebSocket) -> None:
        if channel_id in self.channels:
            self.channels[channel_id].discard(websocket)
            if not self.channels[channel_id]:
                del self.channels[channel_id]

    async def broadcast_channel(self, channel_id: str, data: dict) -> None:
        for ws in self.channels.get(channel_id, set()):
            await ws.send_json(data)


manager = ConnectionManager()
