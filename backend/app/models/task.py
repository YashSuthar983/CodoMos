from datetime import datetime
from typing import Optional, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import Field


class Task(Document):
    project_id: Optional[PydanticObjectId] = None
    title: str
    status: str = "todo"  # todo, in_progress, done
    assignee_id: Optional[PydanticObjectId] = None
    source: Optional[str] = None
    links: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tasks"
