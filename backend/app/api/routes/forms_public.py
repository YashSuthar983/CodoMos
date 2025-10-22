from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
import httpx
from typing import Any, Dict

from app.models import Form, FormResponse, Candidate, Task
from app.schemas.form import FormOut, FormResponseCreate, FormResponseOut

router = APIRouter(prefix="/forms", tags=["public-forms"])  # will be included under /public


@router.get("/{form_id}", response_model=FormOut)
async def get_form_public(form_id: str):
    form = await Form.get(PydanticObjectId(form_id))
    if not form or not form.published:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.post("/{form_id}/responses", response_model=FormResponseOut)
async def submit_form_public(form_id: str, payload: FormResponseCreate):
    form = await Form.get(PydanticObjectId(form_id))
    if not form or not form.published:
        raise HTTPException(status_code=404, detail="Form not available")
    resp = FormResponse(form_id=PydanticObjectId(form_id), mapped_entity=payload.mapped_entity, payload=payload.payload)
    await resp.insert()

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

    return resp
