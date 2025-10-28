from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from beanie import Document, Link
from pydantic import BaseModel, Field

from app.models.user import User


class Attachment(BaseModel):
    filename: str
    url: str
    size: Optional[int] = None
    content_type: Optional[str] = None


class Message(Document):
    sender: Link[User]
    # Either direct message between two users or within a channel
    recipient_user: Optional[Link[User]] = None
    channel_id: Optional[str] = None

    content: str = ""
    attachments: List[Attachment] = Field(default_factory=list)
    mentions: List[str] = Field(default_factory=list)  # usernames mentioned like ["alice", "bob"]

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "messages"
        use_revision = True

    class Config:
        arbitrary_types_allowed = True


__all__ = ["Message", "Attachment"]
