from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from app.models.candidate import HiringStage
from app.models.hiring_task import TaskType, TaskStatus


# Candidate Schemas
class CandidateBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    position_applied: str
    job_posting_id: Optional[str] = None
    resume_text: Optional[str] = None
    resume_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_username: Optional[str] = None
    source: Optional[str] = None
    referred_by: Optional[str] = None
    expected_salary: Optional[float] = None


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    position_applied: Optional[str] = None
    resume_text: Optional[str] = None
    resume_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_username: Optional[str] = None
    current_stage: Optional[HiringStage] = None
    status: Optional[str] = None
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    cultural_fit_score: Optional[float] = None
    notes: Optional[str] = None
    interview_scheduled_at: Optional[datetime] = None
    source: Optional[str] = None
    referred_by: Optional[str] = None
    expected_salary: Optional[float] = None
    offered_salary: Optional[float] = None


class CandidateOut(CandidateBase):
    id: str
    current_stage: HiringStage
    status: str
    overall_score: float
    technical_score: Optional[float] = None
    cultural_fit_score: Optional[float] = None
    interview_scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    assigned_tasks: List[str] = []
    completed_tasks: List[str] = []
    offered_salary: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    hired_at: Optional[datetime] = None
    employee_id: Optional[str] = None

    class Config:
        from_attributes = True


# HiringTask Schemas
class HiringTaskBase(BaseModel):
    title: str
    description: str
    task_type: TaskType
    instructions: Optional[str] = None
    requirements: List[str] = []
    submission_format: Optional[str] = None
    reference_links: List[str] = []
    evaluation_criteria: List[str] = []
    max_score: float = 100.0
    passing_score: float = 60.0
    estimated_duration: Optional[int] = None
    deadline_days: Optional[int] = None
    recommended_stage: Optional[str] = None
    is_required: bool = False
    auto_assign: bool = False
    auto_assign_stages: List[str] = []
    job_posting_id: Optional[str] = None


class HiringTaskCreate(HiringTaskBase):
    pass


class HiringTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    requirements: Optional[List[str]] = None
    submission_format: Optional[str] = None
    reference_links: Optional[List[str]] = None
    evaluation_criteria: Optional[List[str]] = None
    max_score: Optional[float] = None
    passing_score: Optional[float] = None
    estimated_duration: Optional[int] = None
    deadline_days: Optional[int] = None
    recommended_stage: Optional[str] = None
    is_required: Optional[bool] = None
    auto_assign: Optional[bool] = None
    auto_assign_stages: Optional[List[str]] = None
    job_posting_id: Optional[str] = None
    is_active: Optional[bool] = None


class HiringTaskOut(HiringTaskBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# TaskSubmission Schemas
class TaskSubmissionCreate(BaseModel):
    task_id: str
    candidate_id: str


class TaskSubmissionUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    submission_text: Optional[str] = None
    submission_url: Optional[str] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    candidate_notes: Optional[str] = None


class TaskSubmissionReview(BaseModel):
    score: float
    feedback: Optional[str] = None
    status: TaskStatus  # PASSED or FAILED


class TaskSubmissionOut(BaseModel):
    id: str
    task_id: str
    candidate_id: str
    candidate_name: Optional[str] = None
    status: TaskStatus
    submission_text: Optional[str] = None
    submission_url: Optional[str] = None
    assigned_at: datetime
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    candidate_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# InterviewNote Schemas
class InterviewNoteCreate(BaseModel):
    candidate_id: str
    interview_date: datetime
    stage: HiringStage
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    strengths: List[str] = []
    concerns: List[str] = []
    recommendation: Optional[str] = None


class InterviewNoteOut(BaseModel):
    id: str
    candidate_id: str
    interviewer_name: Optional[str] = None
    interview_date: datetime
    stage: HiringStage
    rating: Optional[int] = None
    notes: Optional[str] = None
    strengths: List[str]
    concerns: List[str]
    recommendation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# OnboardingTask Schemas
class OnboardingTaskCreate(BaseModel):
    employee_id: str
    title: str
    description: Optional[str] = None
    category: str
    priority: str = "medium"
    due_date: Optional[datetime] = None
    instructions: Optional[str] = None
    resources: List[str] = []
    order: int = 0


class OnboardingTaskUpdate(BaseModel):
    is_completed: Optional[bool] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


class OnboardingTaskOut(BaseModel):
    id: str
    employee_id: str
    title: str
    description: Optional[str] = None
    category: str
    is_completed: bool
    completed_at: Optional[datetime] = None
    priority: str
    due_date: Optional[datetime] = None
    order: int
    instructions: Optional[str] = None
    resources: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Special Request Schemas
class ConvertToEmployeeRequest(BaseModel):
    generate_password: bool = True
    custom_password: Optional[str] = None
    position: Optional[str] = None
    role: str = "user"
    github_username: Optional[str] = None


class StageChangeRequest(BaseModel):
    new_stage: HiringStage
    notes: Optional[str] = None


class AssignTaskRequest(BaseModel):
    task_ids: List[str]
    deadline_days: Optional[int] = None
