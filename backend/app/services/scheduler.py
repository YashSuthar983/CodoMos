from __future__ import annotations
import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI

from app.models.announcement import Announcement
from app.models.user import User
from app.models.notification import Notification
from app.services.ws import manager


async def _dispatch_announcement(a: Announcement) -> None:
    # Broadcast to all currently connected users. For scope filtering, extend as needed.
    payload = {
        "type": "announcement",
        "id": str(a.id),
        "title": a.title,
        "content": a.content,
        "scope": a.scope,
        "scheduledAt": a.scheduled_at.isoformat() if a.scheduled_at else None,
        "sentAt": datetime.now(timezone.utc).isoformat(),
    }
    # Broadcast to all connections by iterating over known users
    users = await User.find_all().to_list()
    for u in users:
        await manager.send_to_user(str(u.id), payload)
        notif = Notification(user=u, category="announcement", message=a.title, resource_id=str(a.id))
        await notif.insert()


async def _scheduler_loop(app: FastAPI, interval_seconds: int = 30) -> None:
    try:
        while True:
            now = datetime.now(timezone.utc)
            to_send = await Announcement.find(
                (Announcement.scheduled_at != None) &  # noqa: E711
                (Announcement.sent_at == None) &       # noqa: E711
                (Announcement.scheduled_at <= now)
            ).to_list()
            for a in to_send:
                await _dispatch_announcement(a)
                a.sent_at = now
                await a.save()
            await asyncio.sleep(interval_seconds)
    except asyncio.CancelledError:
        return


def start_scheduler(app: FastAPI) -> None:
    app.state.announcement_scheduler = asyncio.create_task(_scheduler_loop(app))


def stop_scheduler(app: FastAPI) -> None:
    task = getattr(app.state, "announcement_scheduler", None)
    if task:
        task.cancel()
