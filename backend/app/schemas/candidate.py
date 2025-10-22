from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class CandidateBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    resume_text: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = 0.0


class CandidateCreate(CandidateBase):
    name: str


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    resume_text: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = None


class CandidateOut(CandidateBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
