from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.announcement import Announcement
from app.services.scheduler import _dispatch_announcement  # intentionally importing internal for send_now

router = APIRouter(prefix="/announcements", tags=["announcements"])


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    scope: str = "company"  # company, department, channel
    department: Optional[str] = None
    channel_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None


@router.post("/", response_model=dict)
async def create_announcement(payload: AnnouncementCreate, user: User = Depends(get_current_user)):
    ann = Announcement(
        title=payload.title,
        content=payload.content,
        scope=payload.scope,
        department=payload.department,
        channel_id=payload.channel_id,
        scheduled_at=payload.scheduled_at,
        created_by=user,
    )
    await ann.insert()
    return {"id": str(ann.id)}


@router.get("/", response_model=List[dict])
async def list_announcements(user: User = Depends(get_current_user)):
    anns = await Announcement.find_all().sort(-Announcement.created_at).to_list()
    return [
        {
            "id": str(a.id),
            "title": a.title,
            "content": a.content,
            "scope": a.scope,
            "scheduledAt": a.scheduled_at.isoformat() if a.scheduled_at else None,
            "sentAt": a.sent_at.isoformat() if a.sent_at else None,
            "createdAt": a.created_at.isoformat(),
        }
        for a in anns
    ]


@router.post("/{announcement_id}/send_now", response_model=dict)
async def send_now(announcement_id: str, user: User = Depends(get_current_user)):
    ann = await Announcement.get(announcement_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if ann.sent_at:
        return {"status": "already_sent"}
    await _dispatch_announcement(ann)
    ann.sent_at = datetime.utcnow()
    await ann.save()
    return {"status": "sent"}
