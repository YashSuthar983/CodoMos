from datetime import datetime
from typing import Optional, Dict
from beanie import Document
from pydantic import Field


class JobRole(Document):
    title: str
    description: Optional[str] = None
    skill_requirements: Optional[Dict[str, int]] = None  # {skill: level}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "job_roles"
