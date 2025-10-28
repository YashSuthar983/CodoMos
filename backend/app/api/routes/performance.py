from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from beanie import PydanticObjectId

from app.models.performance import (
    PerformanceReview, Goal, OneOnOneMeeting, 
    PerformanceImprovementPlan, ReviewCycle, MeetingTemplate,
    ReviewStatus, GoalStatus, MeetingStatus
)
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


# ==================== PERFORMANCE REVIEWS ====================

@router.get("/reviews/")
async def get_reviews(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get performance reviews"""
    query = {}
    
    if employee_id:
        query["employee_id"] = ObjectId(employee_id)
    elif current_user.role != "admin":
        # Non-admins can only see their own reviews or reviews they wrote
        query["$or"] = [
            {"employee_id": current_user.id},
            {"reviewer_id": current_user.id}
        ]
    
    if status:
        query["status"] = status
    
    reviews = await PerformanceReview.find(query).to_list()
    return reviews


@router.post("/reviews/")
async def create_review(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a new performance review"""
    review = PerformanceReview(
        employee_id=PydanticObjectId(data["employee_id"]),
        reviewer_id=current_user.id,
        review_type=data["review_type"],
        title=data["title"],
        period_start=data["period_start"],
        period_end=data["period_end"]
    )
    await review.insert()
    return review


@router.patch("/reviews/{review_id}")
async def update_review(
    review_id: str,
    overall_rating: Optional[float] = None,
    technical_skills_rating: Optional[float] = None,
    communication_rating: Optional[float] = None,
    teamwork_rating: Optional[float] = None,
    leadership_rating: Optional[float] = None,
    comments: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update a performance review"""
    review = await PerformanceReview.get(ObjectId(review_id))
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check permissions
    if review.reviewer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    if overall_rating is not None:
        review.overall_rating = overall_rating
    if technical_skills_rating is not None:
        review.technical_skills_rating = technical_skills_rating
    if communication_rating is not None:
        review.communication_rating = communication_rating
    if teamwork_rating is not None:
        review.teamwork_rating = teamwork_rating
    if leadership_rating is not None:
        review.leadership_rating = leadership_rating
    if comments is not None:
        review.comments = comments
    if status:
        review.status = status
        if status == ReviewStatus.SUBMITTED:
            review.submitted_at = datetime.utcnow()
    
    review.updated_at = datetime.utcnow()
    await review.save()
    return review


@router.get("/reviews/stats")
async def get_review_stats(current_user: User = Depends(get_current_user)):
    """Get review statistics"""
    if current_user.role != "admin":
        employee_id = current_user.id
    else:
        employee_id = None
    
    query = {"employee_id": employee_id} if employee_id else {}
    
    all_reviews = await PerformanceReview.find(query).to_list()
    
    total = len(all_reviews)
    completed = len([r for r in all_reviews if r.status == ReviewStatus.COMPLETED])
    pending = len([r for r in all_reviews if r.status == ReviewStatus.DRAFT])
    
    # Calculate average rating
    ratings = [r.overall_rating for r in all_reviews if r.overall_rating]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    
    return {
        "total_reviews": total,
        "completed": completed,
        "pending": pending,
        "average_rating": round(avg_rating, 2)
    }


# ==================== GOALS (OKRs/KPIs) ====================

@router.get("/goals/")
async def get_goals(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get goals"""
    query = {}
    
    if employee_id:
        query["employee_id"] = ObjectId(employee_id)
    elif current_user.role != "admin":
        query["employee_id"] = current_user.id
    
    if status:
        query["status"] = status
    
    goals = await Goal.find(query).to_list()
    return goals


@router.post("/goals/")
async def create_goal(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a new goal"""
    goal = Goal(
        employee_id=PydanticObjectId(data["employee_id"]),
        created_by=current_user.id,
        title=data["title"],
        description=data["description"],
        goal_type=data["goal_type"],
        start_date=data["start_date"],
        due_date=data["due_date"],
        target_value=data.get("target_value"),
        unit=data.get("unit")
    )
    await goal.insert()
    return goal


@router.patch("/goals/{goal_id}")
async def update_goal(
    goal_id: str,
    status: Optional[str] = None,
    progress_percentage: Optional[float] = None,
    current_value: Optional[float] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update a goal"""
    goal = await Goal.get(ObjectId(goal_id))
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if status:
        goal.status = status
        if status == GoalStatus.COMPLETED:
            goal.completed_at = datetime.utcnow()
    if progress_percentage is not None:
        goal.progress_percentage = progress_percentage
    if current_value is not None:
        goal.current_value = current_value
    if notes:
        goal.notes = notes
    
    goal.updated_at = datetime.utcnow()
    await goal.save()
    return goal


@router.get("/goals/stats")
async def get_goal_stats(current_user: User = Depends(get_current_user)):
    """Get goal statistics"""
    query = {} if current_user.role == "admin" else {"employee_id": current_user.id}
    
    all_goals = await Goal.find(query).to_list()
    
    total = len(all_goals)
    completed = len([g for g in all_goals if g.status == GoalStatus.COMPLETED])
    in_progress = len([g for g in all_goals if g.status == GoalStatus.IN_PROGRESS])
    at_risk = len([g for g in all_goals if g.status == GoalStatus.AT_RISK])
    
    # Calculate completion rate
    completion_rate = (completed / total * 100) if total > 0 else 0
    
    return {
        "total_goals": total,
        "completed": completed,
        "in_progress": in_progress,
        "at_risk": at_risk,
        "completion_rate": round(completion_rate, 1)
    }


# ==================== ONE-ON-ONE MEETINGS ====================

@router.get("/meetings/")
async def get_meetings(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get 1:1 meetings"""
    query = {}
    
    if employee_id:
        query["employee_id"] = ObjectId(employee_id)
    elif current_user.role != "admin":
        query["$or"] = [
            {"employee_id": current_user.id},
            {"manager_id": current_user.id}
        ]
    
    if status:
        query["status"] = status
    
    meetings = await OneOnOneMeeting.find(query).sort("-scheduled_date").to_list()
    return meetings


@router.post("/meetings/")
async def create_meeting(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a new 1:1 meeting"""
    meeting = OneOnOneMeeting(
        employee_id=PydanticObjectId(data["employee_id"]),
        manager_id=current_user.id,
        title=data["title"],
        scheduled_date=data["scheduled_date"],
        duration_minutes=data.get("duration_minutes", 30),
        agenda=data.get("agenda", [])
    )
    await meeting.insert()
    return meeting


@router.patch("/meetings/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    status: Optional[str] = None,
    manager_notes: Optional[str] = None,
    employee_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update a meeting"""
    meeting = await OneOnOneMeeting.get(ObjectId(meeting_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if status:
        meeting.status = status
        if status == MeetingStatus.COMPLETED:
            meeting.completed_at = datetime.utcnow()
    if manager_notes is not None:
        meeting.manager_notes = manager_notes
    if employee_notes is not None:
        meeting.employee_notes = employee_notes
    
    meeting.updated_at = datetime.utcnow()
    await meeting.save()
    return meeting


@router.get("/meetings/upcoming")
async def get_upcoming_meetings(current_user: User = Depends(get_current_user)):
    """Get upcoming meetings"""
    query = {
        "$or": [
            {"employee_id": current_user.id},
            {"manager_id": current_user.id}
        ],
        "scheduled_date": {"$gte": datetime.utcnow()},
        "status": MeetingStatus.SCHEDULED
    }
    
    meetings = await OneOnOneMeeting.find(query).sort("scheduled_date").limit(10).to_list()
    return meetings


# ==================== MEETING TEMPLATES ====================

@router.get("/meeting-templates/")
async def get_meeting_templates(current_user: User = Depends(get_current_user)):
    """Get meeting templates"""
    templates = await MeetingTemplate.find_all().to_list()
    return templates


@router.post("/meeting-templates/")
async def create_meeting_template(
    name: str,
    description: Optional[str] = None,
    default_agenda: Optional[List[str]] = None,
    default_duration: int = 30,
    current_user: User = Depends(get_current_user)
):
    """Create a meeting template"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    template = MeetingTemplate(
        name=name,
        description=description,
        default_agenda=default_agenda or [],
        default_duration=default_duration,
        created_by=current_user.id
    )
    await template.insert()
    return template


# ==================== DASHBOARD & ANALYTICS ====================

@router.get("/dashboard/")
async def get_performance_dashboard(current_user: User = Depends(get_current_user)):
    """Get performance management dashboard data"""
    if current_user.role == "admin":
        # Admin sees organization-wide data
        reviews = await PerformanceReview.find_all().to_list()
        goals = await Goal.find_all().to_list()
        meetings = await OneOnOneMeeting.find_all().to_list()
    else:
        # Employees see their own data
        reviews = await PerformanceReview.find({"employee_id": current_user.id}).to_list()
        goals = await Goal.find({"employee_id": current_user.id}).to_list()
        meetings = await OneOnOneMeeting.find({
            "$or": [{"employee_id": current_user.id}, {"manager_id": current_user.id}]
        }).to_list()
    
    # Calculate stats
    total_reviews = len(reviews)
    avg_rating = sum(r.overall_rating for r in reviews if r.overall_rating) / total_reviews if total_reviews > 0 else 0
    
    total_goals = len(goals)
    completed_goals = len([g for g in goals if g.status == GoalStatus.COMPLETED])
    goal_completion_rate = (completed_goals / total_goals * 100) if total_goals > 0 else 0
    
    upcoming_meetings = len([m for m in meetings if m.scheduled_date >= datetime.utcnow() and m.status == MeetingStatus.SCHEDULED])
    
    return {
        "reviews": {
            "total": total_reviews,
            "average_rating": round(avg_rating, 2),
            "completed": len([r for r in reviews if r.status == ReviewStatus.COMPLETED])
        },
        "goals": {
            "total": total_goals,
            "completed": completed_goals,
            "completion_rate": round(goal_completion_rate, 1),
            "at_risk": len([g for g in goals if g.status == GoalStatus.AT_RISK])
        },
        "meetings": {
            "upcoming": upcoming_meetings,
            "total": len(meetings),
            "completed_this_month": len([m for m in meetings if m.completed_at and m.completed_at >= datetime.utcnow().replace(day=1)])
        }
    }
