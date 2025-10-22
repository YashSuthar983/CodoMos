from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import EmailStr, Field


class Candidate(Document):
    name: str
    email: Optional[EmailStr] = None
    resume_text: Optional[str] = None
    status: str = "applied"  # applied, screened, interview, offer, hired, rejected
    score: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "candidates"
