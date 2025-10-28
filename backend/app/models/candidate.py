from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import EmailStr, Field
from enum import Enum


class HiringStage(str, Enum):
    """Hiring pipeline stages"""
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    TECHNICAL_ASSESSMENT = "technical_assessment"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class InterviewNote(Document):
    """Interview feedback and notes"""
    candidate_id: PydanticObjectId
    interviewer_id: PydanticObjectId  # User who conducted interview
    interviewer_name: Optional[str] = None
    interview_date: datetime
    stage: HiringStage
    rating: Optional[int] = Field(None, ge=1, le=5)  # 1-5 stars
    notes: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    recommendation: Optional[str] = None  # "hire", "reject", "maybe"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "interview_notes"


class Candidate(Document):
    """Candidate/Applicant in the hiring pipeline"""
    # Basic Information
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    position_applied: str  # e.g., "Senior Backend Developer"
    job_posting_id: Optional[PydanticObjectId] = None  # Link to specific job posting
    
    # Resume & Portfolio
    resume_text: Optional[str] = None
    resume_url: Optional[str] = None  # Link to uploaded resume
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_username: Optional[str] = None
    
    # Hiring Status
    current_stage: HiringStage = Field(default=HiringStage.APPLIED)
    status: str = "active"  # active, hired, rejected, withdrawn
    
    # Scoring & Evaluation
    overall_score: float = Field(default=0.0, ge=0, le=100)
    technical_score: Optional[float] = Field(None, ge=0, le=100)
    cultural_fit_score: Optional[float] = Field(None, ge=0, le=100)
    
    # Stage History
    stage_history: List[Dict[str, Any]] = Field(default_factory=list)  # Track stage changes
    # Example: [{"stage": "applied", "timestamp": "...", "notes": "..."}]
    
    # Interview & Notes
    interview_scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None  # General notes about candidate
    internal_comments: List[str] = Field(default_factory=list)
    
    # Task Assignment
    assigned_tasks: List[PydanticObjectId] = Field(default_factory=list)  # HiringTask IDs
    completed_tasks: List[PydanticObjectId] = Field(default_factory=list)
    
    # Form Responses (NEW)
    application_form_id: Optional[PydanticObjectId] = None  # Main application form
    form_responses: List[PydanticObjectId] = Field(default_factory=list)  # All form response IDs
    
    # AI Analysis (NEW)
    ai_analysis: Optional[Dict[str, Any]] = None  # AI-generated suggestions
    ai_attachment_analysis: List[Dict[str, Any]] = Field(default_factory=list)  # Analysis of resumes, portfolios
    ai_analyzed_at: Optional[datetime] = None
    ai_confidence: Optional[str] = None  # high, medium, low
    
    # Source & Referral
    source: Optional[str] = None  # "LinkedIn", "Referral", "Website", etc.
    referred_by: Optional[str] = None
    
    # Salary & Expectations
    expected_salary: Optional[float] = None
    offered_salary: Optional[float] = None
    
    # Metadata
    created_by: Optional[PydanticObjectId] = None  # Admin/HR who added candidate
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    hired_at: Optional[datetime] = None
    employee_id: Optional[PydanticObjectId] = None  # User ID after conversion to employee

    class Settings:
        name = "candidates"
