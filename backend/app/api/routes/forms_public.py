from fastapi import APIRouter, HTTPException, File, UploadFile, Form as FastAPIForm, Depends
from beanie import PydanticObjectId
import httpx
from typing import Any, Dict, Optional
import secrets
import string
import io
import PyPDF2

from app.models import Form, FormResponse, Candidate, Task, User, HiringTask, TaskSubmission, JobPosting
from app.schemas.form import FormOut, FormResponseCreate, FormResponseOut
from app.core.config import settings

router = APIRouter(prefix="/forms", tags=["public-forms"])  # will be included under /public


@router.get("/{form_id}", response_model=FormOut)
async def get_form_public(form_id: str):
    form = await Form.get(PydanticObjectId(form_id))
    if not form or not form.published:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.post("/{form_id}/responses", response_model=FormResponseOut)
async def submit_form_public(
    form_id: str,
    payload: str = FastAPIForm(...),  # JSON string of form data
    resume_file: Optional[UploadFile] = File(None)  # Optional file upload
):
    """Submit form with optional file upload (resume PDF)"""
    import json
    
    form = await Form.get(PydanticObjectId(form_id))
    if not form or not form.published:
        raise HTTPException(status_code=404, detail="Form not available")
    
    # Parse JSON payload
    try:
        payload_data = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid payload format")
    
    # Extract resume text from file if uploaded
    resume_text = None
    resume_filename = None
    if resume_file:
        resume_filename = resume_file.filename
        file_content = await resume_file.read()
        
        # Extract text based on file type
        file_ext = resume_file.filename.lower().split('.')[-1] if resume_file.filename else ''
        if file_ext == 'pdf':
            try:
                pdf_file = io.BytesIO(file_content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                resume_text = ""
                for page in pdf_reader.pages:
                    resume_text += page.extract_text() + "\n"
            except Exception as e:
                print(f"⚠️  PDF extraction failed: {e}")
                resume_text = "[PDF uploaded - text extraction failed]"
        elif file_ext == 'txt':
            resume_text = file_content.decode('utf-8', errors='ignore')
        else:
            resume_text = f"[{file_ext.upper()} file uploaded - text extraction not implemented]"
        
        print(f"📄 Resume uploaded: {resume_filename} ({len(resume_text)} chars extracted)")
    
    resp = FormResponse(
        form_id=PydanticObjectId(form_id),
        mapped_entity=payload_data.get('mapped_entity'),
        payload=payload_data.get('payload', {})
    )
    await resp.insert()
    
    # Store credentials if new candidate created
    new_candidate_credentials = None

    # Auto-create candidate if this is a job application form (public submission)
    if form.mapping and form.mapping.get("entity_type") == "candidate":
        job_posting_id = form.mapping.get("job_posting_id")

        # Extract candidate data from form payload
        form_data = payload_data.get('payload', {})

        # Check if candidate already exists (by email)
        existing = await Candidate.find_one(Candidate.email == form_data.get("email"))

        if not existing:
            # Create new candidate from form submission
            candidate = Candidate(
                full_name=form_data.get("full_name", "Unknown"),
                email=form_data.get("email"),
                phone=form_data.get("phone"),
                position_applied=form_data.get("position", "Not specified"),
                linkedin_url=form_data.get("linkedin_url"),
                github_username=form_data.get("github_username"),
                resume_url=resume_filename if resume_filename else form_data.get("resume_url"),
                resume_text=resume_text,  # Store extracted resume text
                expected_salary=float(form_data.get("expected_salary")) if form_data.get("expected_salary") else None,
                source="Public Application Form",
                application_form_id=form.id,
                form_responses=[resp.id],
                notes=f"Motivation: {form_data.get('motivation', '')}\n\nExperience: {form_data.get('experience', '')}\n\nSkills: {form_data.get('skills', '')}"
            )
            # If job posting exists, link it and use its title for position
            if job_posting_id:
                try:
                    from app.models import JobPosting
                    job = await JobPosting.get(PydanticObjectId(job_posting_id))
                    if job:
                        candidate.position_applied = job.title
                        candidate.job_posting_id = job.id  # Link to job posting
                except Exception:
                    pass

            await candidate.insert()
            
            # Run AI analysis if resume text was extracted and job exists
            if resume_text and job_posting_id and len(resume_text) > 50:
                try:
                    from app.services.ai_hiring_assistant import analyze_resume_for_job
                    from datetime import datetime
                    
                    job = await JobPosting.get(PydanticObjectId(job_posting_id))
                    if job:
                        print(f"\n🤖 Running AI analysis on resume for {candidate.full_name}...")
                        analysis_result = analyze_resume_for_job(
                            resume_text=resume_text,
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
                            print(f"✅ AI Analysis complete! Match score: {candidate.overall_score}%")
                except Exception as e:
                    print(f"⚠️  AI analysis failed: {e}")

            # Auto-assign tasks for the candidate's initial stage
            await auto_assign_tasks_for_candidate(candidate, candidate.current_stage)
            
            # Generate random password and create user account for candidate portal
            random_password = generate_random_password()
            
            # Create user account for candidate to check status
            user = User(
                email=candidate.email,
                full_name=candidate.full_name,
                hashed_password=get_password_hash(random_password),
                role="candidate",
                is_active=True,
                candidate_id=candidate.id
            )
            await user.insert()
            
            # Store credentials to return in response (no SMTP needed)
            new_candidate_credentials = {
                "email": candidate.email,
                "password": random_password,
                "full_name": candidate.full_name,
                "position": candidate.position_applied,
                "portal_url": "http://localhost:5173/login"  # Update with your actual URL
            }
            
            # Print credentials to console (for development)
            print(f"\n" + "="*60)
            print("📧 CANDIDATE CREDENTIALS (No SMTP - Show in Popup)")
            print("="*60)
            print(f"Email: {candidate.email}")
            print(f"Password: {random_password}")
            print(f"Portal: http://localhost:5173/login")
            print("="*60 + "\n")

            # Link response to candidate
            resp.mapped_entity = {"type": "candidate", "id": str(candidate.id)}
            await resp.save()
        else:
            # Update existing candidate with form response
            if resp.id not in existing.form_responses:
                existing.form_responses.append(resp.id)
                await existing.save()

            # Link response to existing candidate
            resp.mapped_entity = {"type": "candidate", "id": str(existing.id)}
            await resp.save()
            
            # Note: For existing candidates, credentials already exist
            new_candidate_credentials = {
                "existing_candidate": True,
                "email": existing.email,
                "message": "You already have an account. Please use your existing credentials."
            }

    # Minimal triggers allowed for public as well
    if form.triggers:
        for trig in form.triggers:
            if trig.get("type") == "create_task":
                params = trig.get("params", {})
                task = Task(title=params.get("title", f"Form Task #{form_id}"), status="todo", source=f"form:{form_id}")
                await task.insert()
            if trig.get("type") == "update_candidate_stage":
                params = trig.get("params", {})
                cand_id = params.get("candidate_id") or (payload.mapped_entity or {}).get("id")
                if cand_id:
                    cand = await Candidate.get(PydanticObjectId(str(cand_id)))
                    if cand:
                        cand.status = params.get("stage", cand.status)
                        await cand.save()
            if trig.get("type") == "send_webhook":
                params = trig.get("params", {}) or {}
                url = params.get("url")
                data = params.get("payload", {}) or {}
                if url:
                    def _tmpl(value: Any) -> Any:
                        if isinstance(value, str):
                            return (
                                value.replace("{{form_id}}", str(form.id))
                                     .replace("{{response_id}}", str(resp.id))
                            )
                        if isinstance(value, dict):
                            return {k: _tmpl(v) for k, v in value.items()}
                        if isinstance(value, list):
                            return [_tmpl(v) for v in value]
                        return value
                    payload_rendered: Dict[str, Any] = _tmpl(data)
                    payload_rendered.setdefault("values", resp.payload)
                    try:
                        async with httpx.AsyncClient(timeout=5.0) as client:
                            await client.post(url, json=payload_rendered)
                    except Exception:
                        pass
    
    # Return response with credentials if new candidate was created
    response_data = {
        "id": str(resp.id),
        "form_id": str(resp.form_id),
        "mapped_entity": resp.mapped_entity,
        "created_at": resp.created_at.isoformat() if resp.created_at else None
    }
    
    if new_candidate_credentials:
        response_data["credentials"] = new_candidate_credentials
    
    return response_data


async def auto_assign_tasks_for_candidate(candidate: Candidate, stage: str):
    """
    Auto-assign tasks that are configured for the given stage.
    This is called when a candidate is created or their stage changes.
    """
    print(f"\n🤖 AUTO-ASSIGN: Checking tasks for candidate '{candidate.full_name}' at stage '{stage}'")
    
    # Find all active tasks with auto_assign enabled for this stage
    tasks = await HiringTask.find(
        HiringTask.is_active == True,
        HiringTask.auto_assign == True
    ).to_list()
    
    print(f"   Found {len(tasks)} tasks with auto_assign=True")
    
    # Filter tasks for this stage
    matching_tasks = []
    for task in tasks:
        if stage in (task.auto_assign_stages or []):
            # Check job-specific filtering
            if task.job_posting_id:
                # Job-specific task: only assign if candidate's job matches
                if candidate.job_posting_id and str(candidate.job_posting_id) == str(task.job_posting_id):
                    matching_tasks.append(task)
            else:
                # Global task: assign to all candidates
                matching_tasks.append(task)
    
    # Get existing task submissions for this candidate
    existing_submissions = await TaskSubmission.find(
        TaskSubmission.candidate_id == candidate.id
    ).to_list()
    existing_task_ids = {str(sub.task_id) for sub in existing_submissions}
    
    print(f"   Matching tasks for stage '{stage}': {len(matching_tasks)}")
    print(f"   Existing submissions: {len(existing_task_ids)}")
    
    # Create task submissions for new tasks
    assigned_count = 0
    for task in matching_tasks:
        if str(task.id) not in existing_task_ids:
            submission = TaskSubmission(
                candidate_id=candidate.id,
                task_id=task.id,
                status="pending"
            )
            await submission.insert()
            assigned_count += 1
            print(f"   ✅ Auto-assigned task '{task.title}' to candidate '{candidate.full_name}'")
        else:
            print(f"   ⏭️  Skipped task '{task.title}' (already assigned)")
    
    if assigned_count == 0:
        print(f"   ⚠️  No new tasks assigned. Check that tasks exist with:")
        print(f"      - auto_assign = True")
        print(f"      - auto_assign_stages includes '{stage}'")
        print(f"      - is_active = True")
    print()


def generate_random_password(length: int = 12) -> str:
    """Generate a random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


async def send_candidate_welcome_email(email: str, full_name: str, password: str, position: str):
    """
    Send welcome email to candidate with login credentials.
    """
    try:
        # TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
        # For now, we'll log the credentials
        print("\n" + "="*60)
        print("📧 CANDIDATE WELCOME EMAIL")
        print("="*60)
        print(f"To: {email}")
        print(f"Subject: Welcome to CogniWork - Your Application for {position}")
        print("-"*60)
        print(f"Hi {full_name},")
        print("")
        print(f"Thank you for applying for the {position} position!")
        print("")
        print("Your application has been received and you can now track its status")
        print("using our candidate portal.")
        print("")
        print("Login Credentials:")
        print(f"  Portal URL: {settings.FRONTEND_URL}/login")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print("")
        print("What's next:")
        print("  1. Log in to check your application status")
        print("  2. Complete any assigned tasks")
        print("  3. Track your progress through the hiring pipeline")
        print("")
        print("We'll notify you of any updates to your application.")
        print("")
        print("Best regards,")
        print("The CogniWork Team")
        print("="*60 + "\n")
        
        # TODO: Replace with actual email sending
        # Example with SendGrid:
        # import sendgrid
        # from sendgrid.helpers.mail import Mail, Email, To, Content
        # 
        # sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        # from_email = Email("noreply@cogniwork.com")
        # to_email = To(email)
        # subject = f"Welcome to CogniWork - Your Application for {position}"
        # content = Content("text/html", email_html_content)
        # mail = Mail(from_email, to_email, subject, content)
        # response = sg.client.mail.send.post(request_body=mail.get())
        
    except Exception as e:
        print(f"Failed to send email to {email}: {str(e)}")
        # Don't raise exception - email failure shouldn't block the process
