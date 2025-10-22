from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import Field


class Project(Document):
    name: str
    status: str = "active"
    repo_ids: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "projects"
