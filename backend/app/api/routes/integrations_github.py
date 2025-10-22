from fastapi import APIRouter, Header, Request, HTTPException
from typing import Optional
from beanie import PydanticObjectId

from app.models import Repo
from app.services.github_service import handle_github_event

router = APIRouter(prefix="/integrations/github", tags=["integrations"])


@router.post("/webhook/{repo_id}")
async def github_webhook(repo_id: str, request: Request, x_github_event: Optional[str] = Header(None)):
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    payload = await request.json()
    await handle_github_event(x_github_event or "", payload, repo)
    return {"ok": True}
