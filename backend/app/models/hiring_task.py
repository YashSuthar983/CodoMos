from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import Field, HttpUrl
from enum import Enum


class TaskType(str, Enum):
    """Types of hiring tasks"""
    CODING_CHALLENGE = "coding_challenge"
    TAKE_HOME_PROJECT = "take_home_project"
    WRITTEN_ASSESSMENT = "written_assessment"
    PORTFOLIO_REVIEW = "portfolio_review"
    VIDEO_INTRODUCTION = "video_introduction"
    CUSTOM = "custom"


class TaskStatus(str, Enum):
    """Status of a task submission"""
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    PASSED = "passed"
    FAILED = "failed"


class HiringTask(Document):
    """Task template that can be assigned to candidates"""
    # Task Details
    title: str
    description: str
    task_type: TaskType
    
    # Instructions
    instructions: Optional[str] = None
    requirements: List[str] = Field(default_factory=list)
    submission_format: Optional[str] = None  # "GitHub repo", "PDF", "Video link", etc.
    
    # Resources
    reference_links: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)  # URLs to files
    
    # Evaluation Criteria
    evaluation_criteria: List[str] = Field(default_factory=list)
    max_score: float = 100.0
    passing_score: float = 60.0
    
    # Time & Deadlines
    estimated_duration: Optional[int] = None  # in hours
    deadline_days: Optional[int] = None  # Days after assignment
    
    # Stage Association
    recommended_stage: Optional[str] = None  # "screening", "interview", etc.
    is_required: bool = False  # Required vs optional task
    
    # Auto-Assignment (NEW)
    auto_assign: bool = False  # Automatically assign to candidates
    auto_assign_stages: List[str] = Field(default_factory=list)  # Stages that trigger auto-assignment (e.g., ["applied", "screening"])
    
    # Job-Specific Assignment (NEW)
    job_posting_id: Optional[PydanticObjectId] = None  # Link to specific job posting (None = applies to all jobs)
    
    # Metadata
    created_by: Optional[PydanticObjectId] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "hiring_tasks"


class TaskSubmission(Document):
    """Candidate's submission for a hiring task"""
    # References
    task_id: PydanticObjectId  # HiringTask
    candidate_id: PydanticObjectId  # Candidate
    candidate_name: Optional[str] = None
    
    # Submission Details
    status: TaskStatus = Field(default=TaskStatus.ASSIGNED)
    submission_text: Optional[str] = None
    submission_url: Optional[str] = None  # GitHub repo, video link, etc.
    attachments: List[str] = Field(default_factory=list)
    
    # Timing
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    
    # Evaluation
    score: Optional[float] = None
    feedback: Optional[str] = None
    reviewed_by: Optional[PydanticObjectId] = None  # User ID
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    # Notes
    candidate_notes: Optional[str] = None  # Candidate's notes about the task
    internal_notes: Optional[str] = None  # Admin/reviewer notes
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "task_submissions"


class OnboardingTask(Document):
    """Onboarding checklist item for new hires"""
    # Task Details
    title: str
    description: Optional[str] = None
    category: str  # "documentation", "setup", "training", etc.
    
    # Assignment
    employee_id: PydanticObjectId  # User who was hired
    assigned_by: Optional[PydanticObjectId] = None
    
    # Status
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    
    # Priority & Deadline
    priority: str = "medium"  # "low", "medium", "high"
    due_date: Optional[datetime] = None
    order: int = 0  # For ordering tasks
    
    # Instructions
    instructions: Optional[str] = None
    resources: List[str] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "onboarding_tasks"
