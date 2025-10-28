from __future__ import annotations
from datetime import datetime
from typing import Optional, Dict, Any
from beanie import Document
from pydantic import Field


class EmailTemplate(Document):
    key: str  # e.g., task_assignment, leave_approved, review_reminder, project_update
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "email_templates"


__all__ = ["EmailTemplate"]
