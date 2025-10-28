from __future__ import annotations
from datetime import datetime
from typing import Optional
from beanie import Document, Link
from pydantic import Field
from typing import Dict, Any
from app.models.user import User


class Notification(Document):
    user: Link[User]
    category: str  # mention, announcement, task_assignment, leave, review_reminder, project_update
    message: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"


__all__ = ["Notification"]
