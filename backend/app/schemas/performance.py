from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from beanie import PydanticObjectId
from bson import ObjectId


# Review Schemas
class ReviewCreate(BaseModel):
    employee_id: str
    review_type: str
    title: str
    period_start: datetime
    period_end: datetime
    overall_rating: Optional[float] = None
    comments: Optional[str] = None


class ReviewUpdate(BaseModel):
    overall_rating: Optional[float] = None
    status: Optional[str] = None
    comments: Optional[str] = None


# Goal Schemas  
class GoalCreate(BaseModel):
    employee_id: str
    title: str
    description: str
    goal_type: str
    start_date: datetime
    due_date: datetime


class GoalUpdate(BaseModel):
    status: Optional[str] = None
    progress_percentage: Optional[float] = None


# Meeting Schemas
class MeetingCreate(BaseModel):
    employee_id: str
    title: str
    scheduled_date: datetime
    duration_minutes: int = 30


class MeetingUpdate(BaseModel):
    status: Optional[str] = None
    manager_notes: Optional[str] = None
