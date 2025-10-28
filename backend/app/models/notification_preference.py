from __future__ import annotations
from beanie import Document, Link
from pydantic import Field
from typing import Optional
from app.models.user import User


class NotificationPreference(Document):
    user: Link[User]
    # In-app toggles per category
    inapp_mention: bool = True
    inapp_announcement: bool = True
    inapp_task_assignment: bool = True
    inapp_leave: bool = True
    inapp_review_reminder: bool = True
    inapp_project_update: bool = True

    # Email toggles per category
    email_task_assignment: bool = True
    email_leave: bool = True
    email_review_reminder: bool = True
    email_project_update: bool = True

    class Settings:
        name = "notification_preferences"


__all__ = ["NotificationPreference"]
