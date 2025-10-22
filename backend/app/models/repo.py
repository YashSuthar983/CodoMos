from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import Field


class Repo(Document):
    provider: str = "github"
    external_id: Optional[str] = None  # GitHub repo id
    name: str
    webhook_secret: Optional[str] = None
    tags: Optional[List[str]] = None  # ["frontend","payments"]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "repos"
