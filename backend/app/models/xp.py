from datetime import datetime
from typing import Optional, Dict
from beanie import Document, PydanticObjectId
from pydantic import Field


class XPEvent(Document):
    person_id: PydanticObjectId
    source: str  # pr_merged, issue_closed, review
    amount: int = 0
    skill_distribution: Optional[Dict[str, float]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "xp_events"
