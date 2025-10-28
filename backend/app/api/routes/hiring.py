from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form as FastAPIForm
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from beanie import PydanticObjectId
import secrets
import string
import io

from app.models import (
    User, Candidate, InterviewNote, HiringTask, TaskSubmission,
    OnboardingTask, HiringStage, TaskStatus, Form, FormResponse,
    JobPosting, JobStatus, JobType
)
from app.schemas.hiring import (
    CandidateCreate, CandidateUpdate, CandidateOut,
    HiringTaskCreate, HiringTaskUpdate, HiringTaskOut,
    TaskSubmissionCreate, TaskSubmissionUpdate, TaskSubmissionReview, TaskSubmissionOut,
    InterviewNoteCreate, InterviewNoteOut,
    OnboardingTaskCreate, OnboardingTaskUpdate, OnboardingTaskOut,
    ConvertToEmployeeRequest, StageChangeRequest, AssignTaskRequest
)
from app.api.deps import get_current_user
from app.core.security import get_password_hash
from app.services.ai_hiring_assistant import (
    analyze_form_response,
    analyze_attachment,
    compare_candidates,
    analyze_resume_for_job
)

router = APIRouter(prefix="/hiring", tags=["hiring"])


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user is admin"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def auto_assign_tasks_for_stage(candidate: Candidate, stage: str):
    """
    Auto-assign tasks that are configured for the given stage.
    This is called when a candidate is created or their stage changes.
    """
    # Find all active tasks with auto_assign enabled for this stage
    auto_tasks = await HiringTask.find(
        HiringTask.is_active == True,
        HiringTask.auto_assign == True
    ).to_list()
    
    assigned_count = 0
    for task in auto_tasks:
        # Check if this task should be assigned for this stage
        if stage in task.auto_assign_stages:
            # Check job posting match: task must be global OR match candidate's job posting
            if task.job_posting_id and candidate.job_posting_id:
                if str(task.job_posting_id) != str(candidate.job_posting_id):
                    continue
            elif task.job_posting_id and not candidate.job_posting_id:
                continue
            
            # Check if task is already assigned to this candidate
            existing = await TaskSubmission.find_one(
                TaskSubmission.candidate_id == candidate.id,
                TaskSubmission.task_id == task.id
            )
            
            if not existing:
                # Create new submission
                deadline = None
                if task.deadline_days:
                    deadline = datetime.utcnow() + timedelta(days=task.deadline_days)
                
                submission = TaskSubmission(
                    task_id=task.id,
                    candidate_id=candidate.id,
                    candidate_name=candidate.full_name,
                    status=TaskStatus.ASSIGNED,
                    deadline=deadline
                )
                await submission.insert()
                
                # Add to candidate's assigned_tasks
                if task.id not in candidate.assigned_tasks:
                    candidate.assigned_tasks.append(task.id)
                
                assigned_count += 1
                print(f"[Auto-Assign] Assigned task '{task.title}' to candidate '{candidate.full_name}' for stage '{stage}'")
    
    if assigned_count > 0:
        await candidate.save()
        print(f"[Auto-Assign] Total {assigned_count} task(s) auto-assigned to '{candidate.full_name}'")
    
    return assigned_count


# ============================================================================
# CANDIDATE ENDPOINTS
# ============================================================================

@router.get("/candidates", response_model=List[CandidateOut])
async def list_candidates(
    stage: str = None,
    status: str = None,
    job_posting_id: str = None,
    sort_by: str = None,  # "score", "score_desc", "date", "date_desc", "name"
    current_user: User = Depends(require_admin)
):
    """List all candidates with optional filtering and sorting"""
    query = {}
    if stage:
        query["current_stage"] = stage
    if status:
        query["status"] = status
    if job_posting_id:
        query["job_posting_id"] = PydanticObjectId(job_posting_id)
    
    # Fetch candidates
    candidates_query = Candidate.find(query)
    
    # Apply sorting
    if sort_by == "score" or sort_by == "score_asc":
        candidates = await candidates_query.sort(+Candidate.overall_score).to_list()
    elif sort_by == "score_desc":
        candidates = await candidates_query.sort(-Candidate.overall_score).to_list()
    elif sort_by == "name":
        candidates = await candidates_query.sort(+Candidate.full_name).to_list()
    elif sort_by == "date":
        candidates = await candidates_query.sort(+Candidate.created_at).to_list()
    elif sort_by == "date_desc":
        candidates = await candidates_query.sort(-Candidate.created_at).to_list()
    else:
        # Default: newest first, then by score
        candidates = await candidates_query.sort(-Candidate.created_at).to_list()
    
    return [
        CandidateOut(
            id=str(c.id),
            **c.dict(exclude={"id"})
        )
        for c in candidates
    ]


@router.post("/candidates", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    candidate_in: CandidateCreate,
    current_user: User = Depends(require_admin)
):
    """Add a new candidate to the hiring pipeline"""
    # Check if candidate with email already exists
    existing = await Candidate.find_one(Candidate.email == candidate_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Candidate with this email already exists")
    
    candidate = Candidate(
        **candidate_in.dict(),
        created_by=current_user.id,
        stage_history=[{
            "stage": HiringStage.APPLIED,
            "timestamp": datetime.utcnow().isoformat(),
            "notes": "Initial application",
            "changed_by": current_user.full_name or current_user.email
        }]
    )
    await candidate.insert()
    
    # Auto-assign tasks for the initial stage
    await auto_assign_tasks_for_stage(candidate, candidate.current_stage)
    
    return CandidateOut(id=str(candidate.id), **candidate.dict(exclude={"id"}))


@router.get("/candidates/{candidate_id}", response_model=Dict[str, Any])
async def get_candidate_detail(
    candidate_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed candidate information including tasks and interview notes"""
    # Allow access if user is admin OR if user is the candidate
    print(f"\n🔍 Candidate access check:")
    print(f"  User role: {current_user.role}")
    print(f"  User candidate_id: {current_user.candidate_id}")
    print(f"  Requested candidate_id: {candidate_id}")
    print(f"  Match: {str(current_user.candidate_id) == candidate_id}\n")
    
    if current_user.role != "admin" and (current_user.role != "candidate" or str(current_user.candidate_id) != candidate_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get assigned tasks and submissions
    task_submissions = await TaskSubmission.find(
        TaskSubmission.candidate_id == candidate.id
    ).to_list()
    
    tasks_data = []
    for submission in task_submissions:
        task = await HiringTask.get(submission.task_id)
        if task:
            tasks_data.append({
                "task": HiringTaskOut(id=str(task.id), **task.dict(exclude={"id"})),
                "submission": TaskSubmissionOut(
                    id=str(submission.id),
                    task_id=str(submission.task_id),
                    candidate_id=str(submission.candidate_id),
                    **submission.dict(exclude={"id", "task_id", "candidate_id"})
                )
            })
    
    # Get interview notes
    interview_notes = await InterviewNote.find(
        InterviewNote.candidate_id == candidate.id
    ).sort(-InterviewNote.interview_date).to_list()
    
    notes_data = [
        InterviewNoteOut(id=str(n.id), candidate_id=str(n.candidate_id), **n.dict(exclude={"id", "candidate_id"}))
        for n in interview_notes
    ]
    
    return {
        "candidate": CandidateOut(id=str(candidate.id), **candidate.dict(exclude={"id"})),
        "tasks": tasks_data,
        "interview_notes": notes_data,
        "stage_history": candidate.stage_history
    }


@router.get("/candidates/{candidate_id}/tasks", response_model=List[Dict[str, Any]])
async def get_candidate_tasks(
    candidate_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get tasks for a specific candidate - accessible by the candidate themselves"""
    # Allow access if user is admin OR if user is the candidate
    if current_user.role != "admin" and (current_user.role != "candidate" or str(current_user.candidate_id) != candidate_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get assigned tasks and submissions
    task_submissions = await TaskSubmission.find(
        TaskSubmission.candidate_id == candidate.id
    ).to_list()
    
    tasks_data = []
    for submission in task_submissions:
        task = await HiringTask.get(submission.task_id)
        if task:
            tasks_data.append({
                "id": str(submission.id),
                "task": {
                    "title": task.title,
                    "description": task.description,
                    "task_type": task.task_type,
                    "instructions": task.instructions,
                    "max_score": task.max_score,
                    "passing_score": task.passing_score
                },
                "status": submission.status,
                "score": submission.score,
                "passed": submission.passed,
                "submission_text": submission.submission_text,
                "submission_url": submission.submission_url,
                "feedback": submission.feedback,
                "submitted_at": submission.submitted_at,
                "reviewed_at": submission.reviewed_at
            })
    
    return tasks_data


@router.patch("/candidates/{candidate_id}", response_model=CandidateOut)
async def update_candidate(
    candidate_id: str,
    update_data: CandidateUpdate,
    current_user: User = Depends(require_admin)
):
    """Update candidate information"""
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Track stage changes
    old_stage = candidate.current_stage
    update_dict = update_data.dict(exclude_unset=True)
    
    for key, value in update_dict.items():
        setattr(candidate, key, value)
    
    # If stage changed, add to history
    if "current_stage" in update_dict and update_dict["current_stage"] != old_stage:
        candidate.stage_history.append({
            "stage": update_dict["current_stage"],
            "timestamp": datetime.utcnow().isoformat(),
            "notes": update_dict.get("notes", "Stage updated"),
            "changed_by": current_user.full_name or current_user.email
        })
    
    candidate.updated_at = datetime.utcnow()
    await candidate.save()
    
    return CandidateOut(id=str(candidate.id), **candidate.dict(exclude={"id"}))


@router.post("/candidates/{candidate_id}/change-stage", response_model=CandidateOut)
async def change_candidate_stage(
    candidate_id: str,
    stage_change: StageChangeRequest,
    current_user: User = Depends(require_admin)
):
    """Move candidate to a different hiring stage"""
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.current_stage = stage_change.new_stage
    candidate.stage_history.append({
        "stage": stage_change.new_stage,
        "timestamp": datetime.utcnow().isoformat(),
        "notes": stage_change.notes or f"Moved to {stage_change.new_stage}",
        "changed_by": current_user.full_name or current_user.email
    })
    candidate.updated_at = datetime.utcnow()
    
    # If moved to HIRED stage, update status and hired_at
    if stage_change.new_stage == HiringStage.HIRED:
        candidate.status = "hired"
        candidate.hired_at = datetime.utcnow()
    elif stage_change.new_stage == HiringStage.REJECTED:
        candidate.status = "rejected"
    
    await candidate.save()
    
    # Auto-assign tasks for the new stage
    await auto_assign_tasks_for_stage(candidate, stage_change.new_stage)
    
    return CandidateOut(id=str(candidate.id), **candidate.dict(exclude={"id"}))


@router.post("/candidates/{candidate_id}/upload-resume")
async def upload_and_analyze_resume(
    candidate_id: str,
    resume_file: UploadFile = File(...),
    current_user: User = Depends(require_admin)
):
    """
    Upload a resume file for a candidate and automatically analyze it using AI.
    Supported formats: .txt, .pdf, .doc, .docx
    """
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Validate file type
    allowed_extensions = ['.txt', '.pdf', '.doc', '.docx']
    file_ext = resume_file.filename.lower().split('.')[-1]
    if f'.{file_ext}' not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Read file content
    content = await resume_file.read()
    
    # Extract text based on file type
    resume_text = ""
    try:
        if file_ext == 'txt':
            resume_text = content.decode('utf-8', errors='ignore')
        elif file_ext == 'pdf':
            # For PDF, we'll store the text in resume_text field
            # In production, you'd use a PDF parsing library like PyPDF2
            resume_text = "[PDF Resume - Please extract text manually or use PDF parser]"
        else:
            resume_text = "[Document uploaded - Text extraction required]"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Store resume text
    candidate.resume_text = resume_text
    candidate.resume_url = f"uploaded_{resume_file.filename}"  # In production, upload to S3/storage
    
    # Get job posting if available
    job_posting = None
    if candidate.job_posting_id:
        job_posting = await JobPosting.get(candidate.job_posting_id)
    
    # Analyze resume if job posting exists
    analysis_result = None
    if job_posting and resume_text and len(resume_text) > 50:
        try:
            analysis_result = analyze_resume_for_job(
                resume_text=resume_text,
                job_title=job_posting.title,
                job_description=job_posting.description,
                requirements=job_posting.requirements,
                nice_to_have=job_posting.nice_to_have
            )
            
            # Update candidate scores
            if analysis_result.get('ai_analyzed'):
                candidate.overall_score = analysis_result['match_score']
                candidate.technical_score = analysis_result['technical_match']
                
                # Store AI analysis
                candidate.ai_analysis = analysis_result
                candidate.ai_analyzed_at = datetime.utcnow()
                candidate.ai_confidence = analysis_result['confidence_level']
                
        except Exception as e:
            # Don't fail the upload if AI analysis fails
            analysis_result = {"error": str(e), "ai_analyzed": False}
    
    candidate.updated_at = datetime.utcnow()
    await candidate.save()
    
    return {
        "message": "Resume uploaded and analyzed successfully",
        "candidate_id": str(candidate.id),
        "resume_filename": resume_file.filename,
        "analysis": analysis_result,
        "overall_score": candidate.overall_score,
        "technical_score": candidate.technical_score
    }


@router.post("/candidates/{candidate_id}/analyze-resume")
async def analyze_candidate_resume(
    candidate_id: str,
    current_user: User = Depends(require_admin)
):
    """
    Re-analyze an existing candidate's resume against their job posting.
    Useful for re-scoring after job requirements change.
    """
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate.resume_text:
        raise HTTPException(status_code=400, detail="No resume text available for analysis")
    
    # Get job posting
    if not candidate.job_posting_id:
        raise HTTPException(status_code=400, detail="Candidate must be linked to a job posting")
    
    job_posting = await JobPosting.get(candidate.job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Analyze resume
    try:
        analysis_result = analyze_resume_for_job(
            resume_text=candidate.resume_text,
            job_title=job_posting.title,
            job_description=job_posting.description,
            requirements=job_posting.requirements,
            nice_to_have=job_posting.nice_to_have
        )
        
        # Update candidate scores
        if analysis_result.get('ai_analyzed'):
            candidate.overall_score = analysis_result['match_score']
            candidate.technical_score = analysis_result['technical_match']
            
            # Store AI analysis
            candidate.ai_analysis = analysis_result
            candidate.ai_analyzed_at = datetime.utcnow()
            candidate.ai_confidence = analysis_result['confidence_level']
            
            candidate.updated_at = datetime.utcnow()
            await candidate.save()
            
            return {
                "message": "Resume analyzed successfully",
                "candidate_id": str(candidate.id),
                "job_title": job_posting.title,
                "analysis": analysis_result,
                "overall_score": candidate.overall_score,
                "technical_score": candidate.technical_score
            }
        else:
            raise HTTPException(status_code=500, detail="AI analysis failed")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/candidates/{candidate_id}/convert-to-employee")
async def convert_candidate_to_employee(
    candidate_id: str,
    convert_data: ConvertToEmployeeRequest,
    current_user: User = Depends(require_admin)
):
    """Convert a hired candidate into an employee (User)"""
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if candidate.current_stage != HiringStage.HIRED:
        raise HTTPException(
            status_code=400,
            detail="Candidate must be in HIRED stage to convert to employee"
        )
    
    # Check if user with this email already exists
    existing_user = await User.find_one(User.email == candidate.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Generate password if needed
    if convert_data.generate_password:
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    else:
        password = convert_data.custom_password or ''.join(
            secrets.choice(string.ascii_letters + string.digits) for _ in range(12)
        )
    
    # Create User (Employee)
    new_user = User(
        email=candidate.email,
        full_name=candidate.full_name,
        role=convert_data.role,
        position=convert_data.position or candidate.position_applied,
        github_username=convert_data.github_username or candidate.github_username,
        hashed_password=get_password_hash(password),
        is_active=True
    )
    await new_user.insert()
    
    # Update candidate with employee_id
    candidate.employee_id = new_user.id
    candidate.status = "hired"
    await candidate.save()
    
    # Create default onboarding tasks
    default_tasks = [
        {
            "title": "Complete HR paperwork",
            "category": "documentation",
            "priority": "high",
            "order": 1
        },
        {
            "title": "Setup development environment",
            "category": "setup",
            "priority": "high",
            "order": 2
        },
        {
            "title": "Review company policies",
            "category": "documentation",
            "priority": "medium",
            "order": 3
        },
        {
            "title": "Setup GitHub account and access",
            "category": "setup",
            "priority": "high",
            "order": 4
        },
        {
            "title": "Meet with team members",
            "category": "training",
            "priority": "medium",
            "order": 5
        }
    ]
    
    for task_data in default_tasks:
        onboarding_task = OnboardingTask(
            employee_id=new_user.id,
            assigned_by=current_user.id,
            **task_data
        )
        await onboarding_task.insert()
    
    return {
        "message": "Candidate converted to employee successfully",
        "employee_id": str(new_user.id),
        "email": new_user.email,
        "temporary_password": password if convert_data.generate_password else None,
        "onboarding_tasks_created": len(default_tasks)
    }


@router.get("/dashboard/stats")
async def get_hiring_dashboard_stats(current_user: User = Depends(require_admin)):
    """Get hiring pipeline statistics for dashboard"""
    all_candidates = await Candidate.find().to_list()
    
    # Count by stage
    stage_counts = {}
    for stage in HiringStage:
        stage_counts[stage.value] = len([c for c in all_candidates if c.current_stage == stage])
    
    # Count by status
    active_count = len([c for c in all_candidates if c.status == "active"])
    hired_count = len([c for c in all_candidates if c.status == "hired"])
    rejected_count = len([c for c in all_candidates if c.status == "rejected"])
    
    # Recent candidates (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_candidates = [c for c in all_candidates if c.created_at >= thirty_days_ago]
    
    # Positions applied for
    positions = {}
    for candidate in all_candidates:
        pos = candidate.position_applied
        positions[pos] = positions.get(pos, 0) + 1
    
    return {
        "total_candidates": len(all_candidates),
        "active_candidates": active_count,
        "hired_count": hired_count,
        "rejected_count": rejected_count,
        "stage_counts": stage_counts,
        "recent_applications": len(recent_candidates),
        "positions": positions
    }


# ============================================================================
# HIRING TASK ENDPOINTS (Task Templates)
# ============================================================================

@router.get("/tasks/templates", response_model=List[HiringTaskOut])
async def list_task_templates(
    task_type: str = None,
    is_active: bool = None,
    current_user: User = Depends(require_admin)
):
    """List all hiring task templates"""
    query = {}
    if task_type:
        query["task_type"] = task_type
    if is_active is not None:
        query["is_active"] = is_active
    
    tasks = await HiringTask.find(query).to_list()
    return [HiringTaskOut(id=str(t.id), **t.dict(exclude={"id"})) for t in tasks]


@router.post("/tasks/templates", response_model=HiringTaskOut, status_code=status.HTTP_201_CREATED)
async def create_task_template(
    task_in: HiringTaskCreate,
    current_user: User = Depends(require_admin)
):
    """Create a new hiring task template"""
    task = HiringTask(**task_in.dict(), created_by=current_user.id)
    await task.insert()
    return HiringTaskOut(id=str(task.id), **task.dict(exclude={"id"}))


@router.patch("/tasks/templates/{task_id}", response_model=HiringTaskOut)
async def update_task_template(
    task_id: str,
    update_data: HiringTaskUpdate,
    current_user: User = Depends(require_admin)
):
    """Update a hiring task template"""
    try:
        task = await HiringTask.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Task template not found")
    
    if not task:
        raise HTTPException(status_code=404, detail="Task template not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(task, key, value)
    
    task.updated_at = datetime.utcnow()
    await task.save()
    
    return HiringTaskOut(id=str(task.id), **task.dict(exclude={"id"}))


@router.delete("/tasks/templates/{task_id}")
async def delete_task_template(
    task_id: str,
    current_user: User = Depends(require_admin)
):
    """Delete a hiring task template"""
    try:
        task = await HiringTask.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Task template not found")
    
    if not task:
        raise HTTPException(status_code=404, detail="Task template not found")
    
    # Check if task is assigned to any candidates
    submissions = await TaskSubmission.find(TaskSubmission.task_id == task.id).to_list()
    if submissions:
        # Just deactivate instead of deleting
        task.is_active = False
        await task.save()
        return {"message": "Task template deactivated (has active submissions)"}
    
    await task.delete()
    return {"message": "Task template deleted successfully"}


# ============================================================================
# TASK ASSIGNMENT & SUBMISSION ENDPOINTS
# ============================================================================

@router.post("/candidates/{candidate_id}/assign-tasks")
async def assign_tasks_to_candidate(
    candidate_id: str,
    assignment: AssignTaskRequest,
    current_user: User = Depends(require_admin)
):
    """Assign tasks to a candidate"""
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    created_submissions = []
    for task_id in assignment.task_ids:
        try:
            task = await HiringTask.get(PydanticObjectId(task_id))
        except Exception:
            continue
        
        if not task:
            continue
        
        # Check if already assigned
        existing = await TaskSubmission.find_one(
            TaskSubmission.task_id == task.id,
            TaskSubmission.candidate_id == candidate.id
        )
        if existing:
            continue
        
        # Calculate deadline
        deadline = None
        if assignment.deadline_days:
            deadline = datetime.utcnow() + timedelta(days=assignment.deadline_days)
        elif task.deadline_days:
            deadline = datetime.utcnow() + timedelta(days=task.deadline_days)
        
        # Create submission
        submission = TaskSubmission(
            task_id=task.id,
            candidate_id=candidate.id,
            candidate_name=candidate.full_name,
            deadline=deadline
        )
        await submission.insert()
        created_submissions.append(str(submission.id))
        
        # Add to candidate's assigned tasks
        if task.id not in candidate.assigned_tasks:
            candidate.assigned_tasks.append(task.id)
    
    await candidate.save()
    
    return {
        "message": f"Assigned {len(created_submissions)} task(s) to candidate",
        "submission_ids": created_submissions
    }


@router.get("/submissions/{submission_id}", response_model=TaskSubmissionOut)
async def get_task_submission(
    submission_id: str,
    current_user: User = Depends(require_admin)
):
    """Get task submission details"""
    try:
        submission = await TaskSubmission.get(PydanticObjectId(submission_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return TaskSubmissionOut(
        id=str(submission.id),
        task_id=str(submission.task_id),
        candidate_id=str(submission.candidate_id),
        **submission.dict(exclude={"id", "task_id", "candidate_id"})
    )


@router.patch("/submissions/{submission_id}", response_model=TaskSubmissionOut)
async def update_task_submission(
    submission_id: str,
    update_data: TaskSubmissionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update task submission (for candidates to submit or admins to update)"""
    try:
        submission = await TaskSubmission.get(PydanticObjectId(submission_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Allow access if user is admin OR if user is the candidate who owns this submission
    if current_user.role != "admin" and (current_user.role != "candidate" or str(current_user.candidate_id) != str(submission.candidate_id)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_dict = update_data.dict(exclude_unset=True)
    
    # If candidate is submitting, set submitted_at timestamp
    if current_user.role == "candidate" and update_dict.get("status") == "submitted" and not submission.submitted_at:
        submission.submitted_at = datetime.utcnow()
    
    for key, value in update_dict.items():
        setattr(submission, key, value)
    
    submission.updated_at = datetime.utcnow()
    await submission.save()
    
    return TaskSubmissionOut(
        id=str(submission.id),
        task_id=str(submission.task_id),
        candidate_id=str(submission.candidate_id),
        **submission.dict(exclude={"id", "task_id", "candidate_id"})
    )


@router.post("/submissions/{submission_id}/review")
async def review_task_submission(
    submission_id: str,
    review: TaskSubmissionReview,
    current_user: User = Depends(require_admin)
):
    """Review and score a task submission"""
    try:
        submission = await TaskSubmission.get(PydanticObjectId(submission_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.score = review.score
    submission.feedback = review.feedback
    submission.status = review.status
    submission.reviewed_by = current_user.id
    submission.reviewed_by_name = current_user.full_name or current_user.email
    submission.reviewed_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()
    
    await submission.save()
    
    # If passed, add to candidate's completed tasks
    if review.status == TaskStatus.PASSED:
        candidate = await Candidate.get(submission.candidate_id)
        if candidate and submission.task_id not in candidate.completed_tasks:
            candidate.completed_tasks.append(submission.task_id)
            await candidate.save()
    
    return {"message": "Submission reviewed successfully"}


# ============================================================================
# INTERVIEW NOTES ENDPOINTS
# ============================================================================

@router.post("/interview-notes", response_model=InterviewNoteOut, status_code=status.HTTP_201_CREATED)
async def create_interview_note(
    note_in: InterviewNoteCreate,
    current_user: User = Depends(require_admin)
):
    """Add interview feedback for a candidate"""
    try:
        candidate = await Candidate.get(PydanticObjectId(note_in.candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    note = InterviewNote(
        **note_in.dict(),
        interviewer_id=current_user.id,
        interviewer_name=current_user.full_name or current_user.email
    )
    await note.insert()
    
    return InterviewNoteOut(
        id=str(note.id),
        candidate_id=str(note.candidate_id),
        **note.dict(exclude={"id", "candidate_id"})
    )


@router.get("/candidates/{candidate_id}/interview-notes", response_model=List[InterviewNoteOut])
async def get_candidate_interview_notes(
    candidate_id: str,
    current_user: User = Depends(require_admin)
):
    """Get all interview notes for a candidate"""
    try:
        candidate_oid = PydanticObjectId(candidate_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid candidate ID")
    
    notes = await InterviewNote.find(
        InterviewNote.candidate_id == candidate_oid
    ).sort(-InterviewNote.interview_date).to_list()
    
    return [
        InterviewNoteOut(
            id=str(n.id),
            candidate_id=str(n.candidate_id),
            **n.dict(exclude={"id", "candidate_id"})
        )
        for n in notes
    ]


# ============================================================================
# ONBOARDING ENDPOINTS
# ============================================================================

@router.get("/onboarding/{employee_id}", response_model=List[OnboardingTaskOut])
async def get_employee_onboarding_tasks(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get onboarding tasks for an employee"""
    # Allow user to see their own onboarding or admins to see anyone's
    if current_user.role != "admin" and str(current_user.id) != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        employee_oid = PydanticObjectId(employee_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid employee ID")
    
    tasks = await OnboardingTask.find(
        OnboardingTask.employee_id == employee_oid
    ).sort(+OnboardingTask.order).to_list()
    
    return [
        OnboardingTaskOut(
            id=str(t.id),
            employee_id=str(t.employee_id),
            **t.dict(exclude={"id", "employee_id"})
        )
        for t in tasks
    ]


@router.post("/onboarding", response_model=OnboardingTaskOut, status_code=status.HTTP_201_CREATED)
async def create_onboarding_task(
    task_in: OnboardingTaskCreate,
    current_user: User = Depends(require_admin)
):
    """Create a new onboarding task for an employee"""
    task = OnboardingTask(**task_in.dict(), assigned_by=current_user.id)
    await task.insert()
    
    return OnboardingTaskOut(
        id=str(task.id),
        employee_id=str(task.employee_id),
        **task.dict(exclude={"id", "employee_id"})
    )


@router.patch("/onboarding/{task_id}", response_model=OnboardingTaskOut)
async def update_onboarding_task(
    task_id: str,
    update_data: OnboardingTaskUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update onboarding task (mark as complete, etc.)"""
    try:
        task = await OnboardingTask.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Allow user to update their own tasks or admins to update any
    if current_user.role != "admin" and task.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = update_data.dict(exclude_unset=True)
    
    # If marking as complete, set completed_at
    if "is_completed" in update_dict and update_dict["is_completed"] and not task.is_completed:
        task.completed_at = datetime.utcnow()
    
    for key, value in update_dict.items():
        setattr(task, key, value)
    
    task.updated_at = datetime.utcnow()
    await task.save()
    
    return OnboardingTaskOut(
        id=str(task.id),
        employee_id=str(task.employee_id),
        **task.dict(exclude={"id", "employee_id"})
    )


@router.delete("/onboarding/{task_id}")
async def delete_onboarding_task(
    task_id: str,
    current_user: User = Depends(require_admin)
):
    """Delete an onboarding task"""
    try:
        task = await OnboardingTask.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await task.delete()
    return {"message": "Onboarding task deleted successfully"}


# ============================================================================
# AI ANALYSIS ENDPOINTS (NEW)
# ============================================================================

@router.post("/candidates/{candidate_id}/ai-analyze")
async def analyze_candidate_with_ai(
    candidate_id: str,
    form_response_id: str = None,
    current_user: User = Depends(require_admin)
):
    """
    Use AI to analyze candidate's form responses and provide suggestions.
    AI provides SUGGESTIONS only - final decisions are made by humans.
    """
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Debug: Log candidate form responses
    print(f"[AI Analysis] Candidate: {candidate.full_name} (ID: {candidate.id})")
    print(f"[AI Analysis] Form responses count: {len(candidate.form_responses) if candidate.form_responses else 0}")
    print(f"[AI Analysis] Form responses: {candidate.form_responses}")
    
    # Get form response to analyze
    if form_response_id:
        try:
            form_response = await FormResponse.get(PydanticObjectId(form_response_id))
            if not form_response:
                raise HTTPException(status_code=404, detail="Form response not found")
        except Exception:
            raise HTTPException(status_code=404, detail="Form response not found")
    else:
        # Use most recent form response
        if not candidate.form_responses or len(candidate.form_responses) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No form responses found for candidate '{candidate.full_name}'. Candidate needs to submit an application form before AI analysis can run."
            )
        try:
            form_response = await FormResponse.get(candidate.form_responses[-1])
        except Exception:
            raise HTTPException(status_code=400, detail="Could not load form response")
    
    # Run AI analysis
    print(f"[AI Analysis] Running analysis on form response...")
    analysis = analyze_form_response(
        form_response=form_response.payload,
        position=candidate.position_applied,
        evaluation_criteria=[
            "Technical skills and experience",
            "Problem-solving ability",
            "Communication skills",
            "Cultural fit",
            "Growth potential"
        ]
    )
    
    print(f"[AI Analysis] ✅ Analysis complete!")
    print(f"[AI Analysis] Result keys: {list(analysis.keys())}")
    print(f"[AI Analysis] Overall score: {analysis.get('overall_score')}")
    print(f"[AI Analysis] Technical score: {analysis.get('technical_score')}")
    print(f"[AI Analysis] Strengths count: {len(analysis.get('strengths', []))}")
    print(f"[AI Analysis] Full result: {analysis}")
    
    # Update candidate with AI suggestions (not final scores)
    candidate.ai_analysis = analysis
    candidate.ai_analyzed_at = datetime.utcnow()
    candidate.ai_confidence = analysis.get("confidence_level", "medium")
    candidate.updated_at = datetime.utcnow()
    
    print(f"[AI Analysis] Saving to candidate...")
    # DO NOT automatically update scores - just store suggestions
    await candidate.save()
    print(f"[AI Analysis] ✅ Saved successfully!")
    
    return {
        "message": "AI analysis complete - review suggestions before making decisions",
        "analysis": analysis,
        "disclaimer": "AI provides suggestions only. Human review and final decision required.",
        "candidate_id": str(candidate.id)
    }


@router.post("/candidates/{candidate_id}/ai-analyze-attachment")
async def analyze_candidate_attachment(
    candidate_id: str,
    file_url: str,  # URL to attachment or base64 data
    file_type: str = "application/pdf",
    current_user: User = Depends(require_admin)
):
    """
    Use AI to analyze candidate's attachments (resume, portfolio, etc.).
    Note: This is a helper endpoint. In production, handle file upload properly.
    """
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # In a real implementation, you'd fetch the file from storage
    # For now, return instructions
    return {
        "message": "Attachment analysis endpoint ready",
        "instructions": [
            "Upload file to storage (S3, Azure Blob, etc.)",
            "Get file content as bytes",
            "Call analyze_attachment() service",
            "Store results in candidate.ai_attachment_analysis"
        ],
        "note": "This endpoint needs file upload integration",
        "candidate_id": str(candidate.id)
    }


@router.post("/candidates/{candidate_id}/apply-ai-suggestions")
async def apply_ai_suggestions(
    candidate_id: str,
    apply_scores: bool = False,
    current_user: User = Depends(require_admin)
):
    """
    Apply AI suggestions to candidate profile.
    Requires explicit admin approval.
    """
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate.ai_analysis:
        raise HTTPException(
            status_code=400,
            detail="No AI analysis found. Run AI analysis first."
        )
    
    # Only apply if admin explicitly approves
    if apply_scores:
        candidate.overall_score = candidate.ai_analysis.get("overall_score", candidate.overall_score)
        candidate.technical_score = candidate.ai_analysis.get("technical_score")
        candidate.cultural_fit_score = candidate.ai_analysis.get("cultural_fit_score")
        
        # Add AI suggestions to notes
        ai_note = f"AI Analysis Applied by {current_user.full_name} on {datetime.utcnow().isoformat()}:\n"
        ai_note += f"Confidence: {candidate.ai_confidence}\n"
        ai_note += f"Reasoning: {candidate.ai_analysis.get('reasoning', 'N/A')}\n"
        ai_note += f"Bias Check: {candidate.ai_analysis.get('bias_check', 'N/A')}"
        
        candidate.internal_comments.append(ai_note)
        candidate.updated_at = datetime.utcnow()
        await candidate.save()
        
        return {
            "message": "AI suggestions applied to candidate profile",
            "scores_updated": True,
            "applied_by": current_user.full_name,
            "note": "Human-approved AI suggestions"
        }
    else:
        return {
            "message": "Set apply_scores=true to apply AI suggestions",
            "current_analysis": candidate.ai_analysis
        }


@router.post("/ai-compare-candidates")
async def ai_compare_candidates(
    candidate_ids: List[str],
    position: str,
    current_user: User = Depends(require_admin)
):
    """
    Use AI to compare multiple candidates objectively.
    Provides ranking suggestions based on qualifications only.
    """
    if len(candidate_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 candidates required for comparison"
        )
    
    if len(candidate_ids) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 candidates can be compared at once"
        )
    
    # Load all candidates
    candidates = []
    for cid in candidate_ids:
        try:
            candidate = await Candidate.get(PydanticObjectId(cid))
            if candidate:
                candidates.append({
                    "candidate_id": str(candidate.id),
                    "name": candidate.full_name,
                    "position": candidate.position_applied,
                    "overall_score": candidate.overall_score,
                    "technical_score": candidate.technical_score,
                    "cultural_fit_score": candidate.cultural_fit_score,
                    "current_stage": candidate.current_stage,
                    "ai_analysis": candidate.ai_analysis
                })
        except Exception:
            continue
    
    if len(candidates) < 2:
        raise HTTPException(
            status_code=400,
            detail="Could not load enough valid candidates"
        )
    
    # Run AI comparison
    comparison = compare_candidates(
        candidates_data=candidates,
        position=position,
        criteria=[
            "Technical skills",
            "Experience level",
            "Cultural fit",
            "Growth potential",
            "Communication skills"
        ]
    )
    
    return {
        "comparison": comparison,
        "candidates_compared": len(candidates),
        "disclaimer": "AI ranking is suggestive only. Final hiring decisions require human judgment and consideration of all factors.",
        "bias_warning": comparison.get("bias_warning", "Review for potential biases")
    }


@router.get("/candidates/{candidate_id}/ai-insights")
async def get_candidate_ai_insights(
    candidate_id: str,
    current_user: User = Depends(require_admin)
):
    """
    Get all AI-generated insights for a candidate.
    """
    try:
        candidate = await Candidate.get(PydanticObjectId(candidate_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {
        "candidate_id": str(candidate.id),
        "candidate_name": candidate.full_name,
        "ai_analysis": candidate.ai_analysis,
        "ai_attachment_analysis": candidate.ai_attachment_analysis,
        "ai_analyzed_at": candidate.ai_analyzed_at,
        "ai_confidence": candidate.ai_confidence,
        "has_ai_insights": bool(candidate.ai_analysis),
        "disclaimer": "AI insights are suggestions to assist decision-making, not final determinations."
    }


# ============================================================================
# JOB POSTING ENDPOINTS (NEW - Centralized Hiring)
# ============================================================================

@router.get("/jobs", response_model=List[Dict[str, Any]])
async def list_job_postings(
    status: str = None,
    current_user: User = Depends(require_admin)
):
    """List all job postings"""
    query = {}
    if status:
        query["status"] = status
    
    jobs = await JobPosting.find(query).sort(-JobPosting.created_at).to_list()
    
    result = []
    for job in jobs:
        # Get applicant count from candidates
        applicants = await Candidate.find(
            Candidate.position_applied == job.title
        ).count()
        
        result.append({
            "id": str(job.id),
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "job_type": job.job_type,
            "status": job.status,
            "is_public": job.is_public,
            "applicant_count": applicants,
            "application_form_id": str(job.application_form_id) if job.application_form_id else None,
            "created_at": job.created_at,
            "application_deadline": job.application_deadline
        })
    
    return result


@router.post("/jobs")
async def create_job_posting(
    data: Dict[str, Any],
    current_user: User = Depends(require_admin)
):
    """
    Create a new job posting.
    Optionally creates an application form automatically.
    """
    
    # Extract data from request body
    title = data.get("title")
    description = data.get("description")
    location = data.get("location", "Remote")
    job_type = data.get("job_type", "full_time")
    department = data.get("department")
    create_application_form = data.get("create_application_form", True)
    auto_create_candidates = data.get("auto_create_candidates", True)
    
    # Create job posting (create in DB first to have a valid ID)
    job = JobPosting(
        title=title,
        description=description,
        location=location,
        job_type=job_type,
        department=department,
        auto_create_candidates=auto_create_candidates,
        created_by=current_user.id,
        status=JobStatus.DRAFT
    )
    await job.insert()
    
    # Auto-create application form if requested
    if create_application_form:
        form_schema = {
            "fields": [
                {"type": "text", "label": "Full Name", "name": "full_name", "required": True},
                {"type": "text", "label": "Email", "name": "email", "required": True},
                {"type": "text", "label": "Phone", "name": "phone", "required": False},
                {"type": "text", "label": "LinkedIn URL", "name": "linkedin_url", "required": False},
                {"type": "text", "label": "GitHub Username", "name": "github_username", "required": False},
                {"type": "textarea", "label": "Why do you want this position?", "name": "motivation", "required": True},
                {"type": "textarea", "label": "Relevant Experience", "name": "experience", "required": True},
                {"type": "text", "label": "Years of Experience", "name": "years_experience", "required": False},
                {"type": "textarea", "label": "Technical Skills", "name": "skills", "required": False},
                {"type": "text", "label": "Expected Salary", "name": "expected_salary", "required": False},
                {"type": "file", "label": "Upload Resume (PDF, DOCX, TXT)", "name": "resume_file", "required": False, "accept": ".pdf,.docx,.txt,.doc"}
            ]
        }
        
        form = Form(
            name=f"Application Form - {title}",
            schema=form_schema,
            published=False,
            mapping={
                "entity_type": "candidate",
                "job_posting_id": str(job.id)
            },
            triggers=[
                {
                    "type": "create_candidate",
                    "params": {
                        "job_posting_id": "{{job_id}}",
                        "auto_analyze": auto_create_candidates
                    }
                }
            ]
        )
        await form.insert()
        job.application_form_id = form.id
        await job.save()  # Save job to persist application_form_id
    
    return {
        "message": "Job posting created successfully",
        "job_id": str(job.id),
        "application_form_id": str(job.application_form_id) if job.application_form_id else None,
        "public_url": f"/apply/{job.id}" if job.is_public else None
    }


@router.get("/jobs/{job_id}")
async def get_job_posting(
    job_id: str,
    current_user: User = Depends(require_admin)
):
    """Get job posting details with applicants"""
    try:
        job = await JobPosting.get(PydanticObjectId(job_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Get all candidates who applied to this job
    candidates = await Candidate.find(
        Candidate.position_applied == job.title
    ).to_list()
    
    # Get form responses if form exists
    form_responses = []
    if job.application_form_id:
        responses = await FormResponse.find(
            FormResponse.form_id == job.application_form_id
        ).to_list()
        form_responses = [
            {
                "id": str(resp.id),
                "payload": resp.payload,
                "created_at": resp.created_at,
                "candidate_id": resp.mapped_entity.get("id") if resp.mapped_entity else None
            }
            for resp in responses
        ]
    
    return {
        "id": str(job.id),
        "title": job.title,
        "description": job.description,
        "department": job.department,
        "location": job.location,
        "job_type": job.job_type,
        "status": job.status,
        "is_public": job.is_public,
        "responsibilities": job.responsibilities,
        "requirements": job.requirements,
        "nice_to_have": job.nice_to_have,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "application_form_id": str(job.application_form_id) if job.application_form_id else None,
        "auto_create_candidates": job.auto_create_candidates,
        "auto_analyze_with_ai": job.auto_analyze_with_ai,
        "applicant_count": len(candidates),
        "candidates": [
            {
                "id": str(c.id),
                "full_name": c.full_name,
                "email": c.email,
                "current_stage": c.current_stage,
                "overall_score": c.overall_score,
                "created_at": c.created_at
            }
            for c in candidates
        ],
        "form_responses": form_responses,
        "created_at": job.created_at,
        "updated_at": job.updated_at
    }


@router.patch("/jobs/{job_id}")
async def update_job_posting(
    job_id: str,
    data: Dict[str, Any],
    current_user: User = Depends(require_admin)
):
    """Update job posting and sync form visibility with job status."""
    try:
        job = await JobPosting.get(PydanticObjectId(job_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    # Extract incoming fields
    status_in = data.get("status")
    is_public_in = data.get("is_public")

    # Update job fields
    if status_in:
        job.status = status_in
    if is_public_in is not None:
        job.is_public = bool(is_public_in)

    # Sync form visibility with job status/public flag
    if job.application_form_id:
        form = await Form.get(job.application_form_id)
        if form:
            # Normalize status value (Enum -> str value)
            status_value = job.status.value if hasattr(job.status, "value") else str(job.status)
            # If job is paused/closed/draft → unpublish form (but don't change is_public)
            if status_value in {"paused", "closed", "draft"}:
                form.published = False
                # Don't force is_public to False - allow manual override later
            # If job is active → publish form (respects is_public setting)
            elif status_value == "active":
                # Only publish if is_public is True (default behavior)
                if job.is_public:
                    form.published = True
            # If explicitly set is_public False → ensure form is private
            if is_public_in is False:
                form.published = False
            await form.save()

    job.updated_at = datetime.utcnow()
    await job.save()

    # Compute form published flag if available
    form_published = None
    if job.application_form_id:
        try:
            _f = await Form.get(job.application_form_id)
            form_published = bool(_f.published) if _f else None
        except Exception:
            form_published = None

    return {
        "message": "Job posting updated",
        "job_id": str(job.id),
        "status": job.status,
        "is_public": job.is_public,
        "form_published": form_published
    }


@router.post("/jobs/{job_id}/publish")
async def publish_job(
    job_id: str,
    current_user: User = Depends(require_admin)
):
    """Publish job posting (make it active and public)"""
    try:
        job = await JobPosting.get(PydanticObjectId(job_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    job.status = JobStatus.ACTIVE
    job.is_public = True
    job.updated_at = datetime.utcnow()
    # Ensure associated form is published
    if job.application_form_id:
        form = await Form.get(job.application_form_id)
        if form:
            form.published = True
            await form.save()
    await job.save()
    
    return {
        "message": "Job published successfully",
        "public_url": f"/apply/{job.id}",
        "application_form_url": f"/public/forms/{job.application_form_id}" if job.application_form_id else None
    }


@router.post("/jobs/{job_id}/bulk-analyze")
async def bulk_analyze_candidates_for_job(job_id: str, current_user: User = Depends(require_admin)):
    """
    Run AI analysis on all candidates with resumes for this specific job.
    Only analyzes candidates who have resume_text but haven't been analyzed yet.
    """
    job = await JobPosting.get(PydanticObjectId(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Find all candidates for this job with resumes
    candidates = await Candidate.find(
        Candidate.job_posting_id == job.id,
        Candidate.resume_text != None
    ).to_list()
    
    if not candidates:
        return {
            "message": "No candidates with resumes found for this job",
            "analyzed_count": 0,
            "skipped_count": 0,
            "failed_count": 0
        }
    
    analyzed_count = 0
    skipped_count = 0
    failed_count = 0
    
    for candidate in candidates:
        # Skip if already analyzed
        if candidate.ai_analyzed_at:
            skipped_count += 1
            continue
        
        # Skip if no resume text
        if not candidate.resume_text or len(candidate.resume_text) < 50:
            skipped_count += 1
            continue
        
        try:
            from app.services.ai_hiring_assistant import analyze_resume_for_job
            from datetime import datetime
            
            print(f"\n🤖 Bulk Analysis: Analyzing {candidate.full_name}...")
            
            analysis_result = analyze_resume_for_job(
                resume_text=candidate.resume_text,
                job_title=job.title,
                job_description=job.description,
                requirements=job.requirements,
                nice_to_have=job.nice_to_have
            )
            
            if analysis_result.get('ai_analyzed'):
                candidate.overall_score = analysis_result['match_score']
                candidate.technical_score = analysis_result['technical_match']
                candidate.ai_analysis = analysis_result
                candidate.ai_analyzed_at = datetime.utcnow()
                candidate.ai_confidence = analysis_result['confidence_level']
                await candidate.save()
                analyzed_count += 1
                print(f"✅ {candidate.full_name}: {candidate.overall_score}%")
            else:
                failed_count += 1
                print(f"⚠️  {candidate.full_name}: Analysis returned no results")
        
        except Exception as e:
            failed_count += 1
            print(f"❌ {candidate.full_name}: {str(e)}")
    
    return {
        "message": f"Bulk analysis complete! Analyzed {analyzed_count} candidates.",
        "analyzed_count": analyzed_count,
        "skipped_count": skipped_count,
        "failed_count": failed_count,
        "total_candidates": len(candidates)
    }
