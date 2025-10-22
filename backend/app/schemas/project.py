from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class RepoBase(BaseModel):
    provider: Optional[str] = "github"
    external_id: Optional[str] = None
    name: str
    webhook_secret: Optional[str] = None
    tags: Optional[List[str]] = None


class RepoCreate(RepoBase):
    name: str


class RepoUpdate(BaseModel):
    name: Optional[str] = None
    webhook_secret: Optional[str] = None
    tags: Optional[List[str]] = None


class RepoOut(RepoBase):
    id: str
    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    name: str
    status: Optional[str] = "active"
    repo_ids: Optional[List[str]] = None


class ProjectCreate(ProjectBase):
    name: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    repo_ids: Optional[List[str]] = None


class ProjectOut(ProjectBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
