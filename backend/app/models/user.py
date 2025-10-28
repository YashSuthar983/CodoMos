from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import EmailStr, Field
from bson import ObjectId


class User(Document):
    email: EmailStr
    full_name: Optional[str] = None
    hashed_password: str
    is_active: bool = True
    role: str = "user"  # admin, user, candidate
    position: Optional[str] = None  # Job title/position (e.g., "Senior Developer", "Product Manager")
    github_username: Optional[str] = None
    github_pat: Optional[str] = None  # Personal Access Token for GitHub API (not exposed via API responses)
    candidate_id: Optional[PydanticObjectId] = None  # Link to Candidate if role is "candidate"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        bson_encoders = {
            ObjectId: str
        }
