"""
Job Posting Model - For centralized hiring system
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from enum import Enum


class JobStatus(str, Enum):
    """Job posting status"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"


class JobType(str, Enum):
    """Employment type"""
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    FREELANCE = "freelance"


class JobPosting(Document):
    """Job posting with integrated application form"""
    
    # Basic Information
    title: str  # "Senior Backend Developer"
    department: Optional[str] = None
    location: str = "Remote"
    job_type: JobType = JobType.FULL_TIME
    
    # Description
    description: str  # Full job description
    responsibilities: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    nice_to_have: List[str] = Field(default_factory=list)
    
    # Compensation
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "USD"
    benefits: List[str] = Field(default_factory=list)
    
    # Application Form Integration
    application_form_id: Optional[PydanticObjectId] = None  # Linked form
    auto_create_candidates: bool = True  # Auto-create candidate from form submission
    auto_analyze_with_ai: bool = False  # Auto-run AI analysis
    
    # Status & Visibility
    status: JobStatus = JobStatus.DRAFT
    is_public: bool = False  # Public job board visibility
    public_url: Optional[str] = None  # Public application URL
    
    # Tracking
    applicant_count: int = 0
    viewed_count: int = 0
    
    # Hiring Pipeline
    candidates: List[PydanticObjectId] = Field(default_factory=list)  # Candidate IDs
    
    # Hiring Team
    hiring_manager_id: Optional[PydanticObjectId] = None
    recruiters: List[PydanticObjectId] = Field(default_factory=list)  # User IDs
    
    # Settings
    application_deadline: Optional[datetime] = None
    positions_available: int = 1
    
    # Metadata
    created_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    
    class Settings:
        name = "job_postings"
