from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from beanie import Document, Link
from pydantic import Field
from app.models.user import User


class Channel(Document):
    name: str
    description: Optional[str] = None
    is_private: bool = False
    members: List[Link[User]] = Field(default_factory=list)
    created_by: Link[User]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "channels"


__all__ = ["Channel"]
