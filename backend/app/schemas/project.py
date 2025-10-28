from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_serializer


class RepoBase(BaseModel):
    provider: Optional[str] = "github"
    external_id: Optional[str] = None
    name: str
    tags: Optional[List[str]] = None
    owner: Optional[str] = None
    repo_name: Optional[str] = None


class RepoCreate(RepoBase):
    name: str
    webhook_secret: Optional[str] = None


class RepoUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None
    webhook_secret: Optional[str] = None
    owner: Optional[str] = None
    repo_name: Optional[str] = None


class RepoOut(RepoBase):
    id: Any
    webhook_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v)


class ProjectBase(BaseModel):
    name: str
    status: Optional[str] = "active"
    repo_ids: Optional[List[str]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = "private"
    default_repo_id: Optional[str] = None


class ProjectNotifications(BaseModel):
    email_enabled: Optional[bool] = None
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None


class ProjectMemberOut(BaseModel):
    user_id: Any
    role: str
    added_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('user_id')
    def serialize_user_id(self, v):
        return str(v)


class ProjectCreate(ProjectBase):
    name: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    repo_ids: Optional[List[str]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None
    default_repo_id: Optional[str] = None
    notifications: Optional[ProjectNotifications] = None


class ProjectOut(ProjectBase):
    id: Any
    members: Optional[List[ProjectMemberOut]] = None
    notifications: Optional[ProjectNotifications] = None
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v)
