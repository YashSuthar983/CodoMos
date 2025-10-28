from datetime import datetime
from typing import Optional, List
from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel


class ProjectMember(BaseModel):
    user_id: PydanticObjectId
    role: str = Field(default="contributor")  # owner, maintainer, contributor
    added_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectNotifications(BaseModel):
    email_enabled: bool = False
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None


class Project(Document):
    name: str
    status: str = "active"
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    visibility: str = Field(default="private")  # private, public, internal
    repo_ids: Optional[List[str]] = None
    default_repo_id: Optional[str] = None
    members: List[ProjectMember] = Field(default_factory=list)
    notifications: ProjectNotifications = Field(default_factory=ProjectNotifications)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "projects"
