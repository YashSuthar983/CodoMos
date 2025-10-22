from typing import Optional, Dict, Any
from pydantic import BaseModel


class TaskBase(BaseModel):
    title: str
    status: Optional[str] = "todo"
    assignee_id: Optional[int] = None
    project_id: Optional[int] = None
    source: Optional[str] = None
    links: Optional[Dict[str, Any]] = None


class TaskCreate(TaskBase):
    title: str


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[int] = None
    project_id: Optional[int] = None
    source: Optional[str] = None
    links: Optional[Dict[str, Any]] = None


class TaskOut(TaskBase):
    id: int

    class Config:
        from_attributes = True
