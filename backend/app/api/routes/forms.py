from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any, Dict
from beanie import PydanticObjectId
import httpx

from app.api.deps import get_current_user
from app.models import Form, FormResponse, Task, Candidate, User
from app.schemas.form import (
    FormCreate, FormOut, FormUpdate, FormResponseCreate, FormResponseOut,
    AISchemaRequest, AISchemaResponse, AITriggersRequest, AITriggersResponse,
)
from app.services.ai_forms import generate_form_schema, generate_triggers

router = APIRouter(prefix="/forms", tags=["forms"])


@router.get("/", response_model=List[FormOut])
async def list_forms(current_user: User = Depends(get_current_user)):
    return await Form.find_all().sort(-Form.created_at).to_list()


@router.get("/{form_id}", response_model=FormOut)
async def get_form(form_id: str):
    form = await Form.get(PydanticObjectId(form_id))
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.post("/", response_model=FormOut)
async def create_form(payload: FormCreate, current_user: User = Depends(get_current_user)):
    form = Form(name=payload.name, schema=payload.schema, mapping=payload.mapping, triggers=payload.triggers, published=bool(payload.published))
    await form.insert()
    return form


@router.post("/ai/suggest-schema", response_model=AISchemaResponse)
async def ai_suggest_schema(req: AISchemaRequest, current_user: User = Depends(get_current_user)):
    schema = generate_form_schema(
        description=req.description,
        industry=req.industry,
        audience=req.audience,
        include_fields=req.include_fields,
        exclude_fields=req.exclude_fields,
    )
    return {"schema": schema}


@router.post("/ai/suggest-triggers", response_model=AITriggersResponse)
async def ai_suggest_triggers(req: AITriggersRequest, current_user: User = Depends(get_current_user)):
    triggers = generate_triggers(use_case=req.use_case, form_schema=req.form_schema)
    return {"triggers": triggers}


@router.patch("/{form_id}", response_model=FormOut)
async def update_form(form_id: str, payload: FormUpdate, current_user: User = Depends(get_current_user)):
    form = await Form.get(PydanticObjectId(form_id))
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Check if published status is being changed
    published_changed = "published" in payload.dict(exclude_unset=True)
    
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(form, field, value)
    await form.save()
    
    # Sync back to job if this form is linked to a job posting
    if published_changed and form.mapping and form.mapping.get("entity_type") == "candidate":
        job_posting_id = form.mapping.get("job_posting_id")
        if job_posting_id:
            try:
                from app.models import JobPosting
                job = await JobPosting.get(PydanticObjectId(job_posting_id))
                if job:
                    # Sync form published status to job is_public
                    job.is_public = form.published
                    await job.save()
            except Exception:
                # Don't fail form update if job sync fails
                pass
    
    return form


@router.post("/{form_id}/responses", response_model=FormResponseOut)
async def submit_form(form_id: str, payload: FormResponseCreate):
    form = await Form.get(PydanticObjectId(form_id))
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    resp = FormResponse(form_id=PydanticObjectId(form_id), mapped_entity=payload.mapped_entity, payload=payload.payload)
    await resp.insert()

    # Auto-create candidate if this is a job application form
    if form.mapping and form.mapping.get("entity_type") == "candidate":
        job_posting_id = form.mapping.get("job_posting_id")
        
        # Extract candidate data from form payload
        form_data = payload.payload
        
        # Check if candidate already exists
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
                resume_url=form_data.get("resume_url"),
                expected_salary=float(form_data.get("expected_salary")) if form_data.get("expected_salary") else None,
                source="Application Form",
                application_form_id=form.id,
                form_responses=[resp.id],
                notes=f"Motivation: {form_data.get('motivation', '')}\n\nExperience: {form_data.get('experience', '')}\n\nSkills: {form_data.get('skills', '')}"
            )
            await candidate.insert()
            
            # Update form response to link to candidate
            resp.mapped_entity = {"type": "candidate", "id": str(candidate.id)}
            await resp.save()
            
            # If job posting exists, get its title for position
            if job_posting_id:
                try:
                    from app.models import JobPosting
                    job = await JobPosting.get(PydanticObjectId(job_posting_id))
                    if job:
                        candidate.position_applied = job.title
                        await candidate.save()
                except Exception:
                    pass
        else:
            # Update existing candidate with form response
            if resp.id not in existing.form_responses:
                existing.form_responses.append(resp.id)
                await existing.save()
            
            # Update form response to link to existing candidate
            resp.mapped_entity = {"type": "candidate", "id": str(existing.id)}
            await resp.save()

    # Basic triggers
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
                    # Simple template replacements
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
                    # Include response payload under "values" if not provided
                    payload_rendered.setdefault("values", resp.payload)
                    try:
                        async with httpx.AsyncClient(timeout=5.0) as client:
                            await client.post(url, json=payload_rendered)
                    except Exception:
                        # Best-effort; do not fail submission on webhook error
                        pass

    return resp


@router.get("/{form_id}/responses", response_model=List[FormResponseOut])
async def list_form_responses(form_id: str, current_user: User = Depends(get_current_user)):
    return await FormResponse.find(FormResponse.form_id == PydanticObjectId(form_id)).sort(-FormResponse.created_at).to_list()
