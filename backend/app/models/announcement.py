from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from beanie import Document, Link
from pydantic import Field
from app.models.user import User


class Announcement(Document):
    title: str
    content: str
    scope: str = "company"  # company, department, channel
    department: Optional[str] = None
    channel_id: Optional[str] = None

    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_by: Link[User]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "announcements"


__all__ = ["Announcement"]
