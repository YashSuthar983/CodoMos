from datetime import datetime
from typing import Optional, List, Dict
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from bson import ObjectId
from enum import Enum


class ReviewType(str, Enum):
    SELF_ASSESSMENT = "self_assessment"
    MANAGER_REVIEW = "manager_review"
    PEER_REVIEW = "peer_review"
    ANNUAL = "annual"
    QUARTERLY = "quarterly"
    MID_YEAR = "mid_year"


class ReviewStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    APPROVED = "approved"


class GoalStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    AT_RISK = "at_risk"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class GoalType(str, Enum):
    OKR = "okr"
    KPI = "kpi"
    PERSONAL = "personal"
    TEAM = "team"
    COMPANY = "company"


class PIPStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ESCALATED = "escalated"


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class FeedbackItem(BaseModel):
    question: str
    answer: str
    rating: Optional[int] = None  # 1-5 scale


class KeyResult(BaseModel):
    description: str
    target: float
    current: float
    unit: str  # e.g., "%", "count", "days"
    completed: bool = False


class ActionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    description: str
    assigned_to: PydanticObjectId
    due_date: Optional[datetime] = None
    completed: bool = False
    completed_at: Optional[datetime] = None


class PerformanceReview(Document):
    """360-degree performance reviews"""
    employee_id: PydanticObjectId  # Person being reviewed
    reviewer_id: PydanticObjectId  # Person writing the review
    review_type: ReviewType
    review_cycle_id: Optional[PydanticObjectId] = None  # Link to review cycle
    
    # Review content
    title: str
    period_start: datetime
    period_end: datetime
    
    # Ratings (1-5 scale)
    overall_rating: Optional[float] = None
    technical_skills_rating: Optional[float] = None
    communication_rating: Optional[float] = None
    teamwork_rating: Optional[float] = None
    leadership_rating: Optional[float] = None
    problem_solving_rating: Optional[float] = None
    
    # Detailed feedback
    feedback_items: List[FeedbackItem] = []
    strengths: List[str] = []
    areas_for_improvement: List[str] = []
    achievements: List[str] = []
    comments: Optional[str] = None
    
    # Manager-specific fields
    recommended_raise: Optional[float] = None  # Percentage
    recommended_promotion: Optional[bool] = None
    promotion_details: Optional[str] = None
    
    # Status tracking
    status: ReviewStatus = ReviewStatus.DRAFT
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[PydanticObjectId] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "performance_reviews"
        indexes = [
            "employee_id",
            "reviewer_id",
            "review_cycle_id",
            "review_type",
            "status"
        ]


class Goal(Document):
    """OKRs and KPIs tracking"""
    employee_id: PydanticObjectId
    created_by: PydanticObjectId
    
    # Goal details
    title: str
    description: str
    goal_type: GoalType
    
    # For OKRs
    objective: Optional[str] = None  # The "O" in OKR
    key_results: List[KeyResult] = []  # The "KRs" in OKR
    
    # For KPIs
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    
    # Timeline
    start_date: datetime
    due_date: datetime
    
    # Progress
    status: GoalStatus = GoalStatus.NOT_STARTED
    progress_percentage: float = 0.0
    
    # Alignment
    aligned_with: Optional[PydanticObjectId] = None  # Parent goal (for cascading goals)
    team_id: Optional[PydanticObjectId] = None  # If it's a team goal
    
    # Tracking
    milestones: List[str] = []
    completed_milestones: List[str] = []
    notes: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Settings:
        name = "goals"
        indexes = [
            "employee_id",
            "goal_type",
            "status",
            "due_date"
        ]


class PerformanceImprovementPlan(Document):
    """PIPs for underperforming employees"""
    employee_id: PydanticObjectId
    manager_id: PydanticObjectId
    
    # PIP details
    title: str
    reason: str  # Why PIP was created
    performance_issues: List[str]
    
    # Expectations
    expected_improvements: List[str]
    success_criteria: List[str]
    
    # Timeline
    start_date: datetime
    end_date: datetime
    review_frequency: str  # e.g., "weekly", "bi-weekly"
    
    # Progress tracking
    status: PIPStatus = PIPStatus.ACTIVE
    progress_notes: List[Dict] = []  # {date, note, rating}
    
    # Outcome
    outcome: Optional[str] = None
    outcome_date: Optional[datetime] = None
    
    # Resources and support
    resources_provided: List[str] = []
    training_required: List[str] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "performance_improvement_plans"
        indexes = [
            "employee_id",
            "manager_id",
            "status"
        ]


class OneOnOneMeeting(Document):
    """1:1 meetings between managers and employees"""
    employee_id: PydanticObjectId
    manager_id: PydanticObjectId
    
    # Meeting details
    title: str
    scheduled_date: datetime
    duration_minutes: int = 30
    location: Optional[str] = None  # "Office", "Zoom", etc.
    
    # Meeting content
    agenda: List[str] = []
    employee_notes: Optional[str] = None
    manager_notes: Optional[str] = None
    
    # Topics discussed
    topics: List[str] = []
    wins: List[str] = []  # Employee wins/achievements
    challenges: List[str] = []
    feedback_given: Optional[str] = None
    feedback_received: Optional[str] = None
    
    # Action items
    action_items: List[ActionItem] = []
    
    # Follow-up
    follow_up_items: List[str] = []
    next_meeting_date: Optional[datetime] = None
    
    # Status
    status: MeetingStatus = MeetingStatus.SCHEDULED
    completed_at: Optional[datetime] = None
    
    # Template
    template_id: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "one_on_one_meetings"
        indexes = [
            "employee_id",
            "manager_id",
            "scheduled_date",
            "status"
        ]


class MeetingTemplate(Document):
    """Templates for 1:1 meetings"""
    name: str
    description: Optional[str] = None
    
    # Template structure
    default_agenda: List[str] = []
    suggested_topics: List[str] = []
    questions: List[str] = []
    
    # Settings
    default_duration: int = 30
    is_default: bool = False
    
    # Metadata
    created_by: PydanticObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "meeting_templates"


class ReviewCycle(Document):
    """Scheduled review cycles (quarterly, annual, etc.)"""
    name: str  # e.g., "Q4 2024 Reviews"
    cycle_type: str  # "quarterly", "annual", "mid_year"
    
    # Timeline
    start_date: datetime
    end_date: datetime
    
    # Review deadlines
    self_assessment_deadline: datetime
    peer_review_deadline: datetime
    manager_review_deadline: datetime
    
    # Participants
    included_employees: List[PydanticObjectId] = []  # Empty = all employees
    excluded_employees: List[PydanticObjectId] = []
    
    # Settings
    require_self_assessment: bool = True
    require_peer_reviews: bool = True
    min_peer_reviews: int = 2
    max_peer_reviews: int = 5
    
    # Status
    is_active: bool = True
    is_completed: bool = False
    
    # Metadata
    created_by: PydanticObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "review_cycles"
        indexes = [
            "is_active",
            "start_date"
        ]
