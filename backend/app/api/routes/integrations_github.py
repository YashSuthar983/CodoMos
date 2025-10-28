from fastapi import APIRouter, Header, Request, HTTPException
from typing import Optional
from beanie import PydanticObjectId

import hmac
import hashlib
import json

from app.models import Repo
from app.services.github_service import handle_github_event

router = APIRouter(prefix="/integrations/github", tags=["integrations"])


def _verify_github_signature(secret: str, body: bytes, sig256: Optional[str], sig1: Optional[str]) -> bool:
    """Verify GitHub webhook signatures.

    - Prefer X-Hub-Signature-256 (HMAC SHA-256)
    - Fallback to X-Hub-Signature (HMAC SHA-1) if present
    """
    if sig256:
        try:
            expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        except Exception:
            return False
        return hmac.compare_digest(expected, sig256)
    if sig1:
        try:
            expected = "sha1=" + hmac.new(secret.encode(), body, hashlib.sha1).hexdigest()
        except Exception:
            return False
        return hmac.compare_digest(expected, sig1)
    # No supported signature header provided
    return False


@router.post("/webhook/{repo_id}")
async def github_webhook(
    repo_id: str,
    request: Request,
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None),
    x_hub_signature: Optional[str] = Header(None),
):
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")

    # Read raw body first for signature verification
    body = await request.body()

    # If secret is configured on repo, enforce signature verification
    if repo.webhook_secret:
        ok = _verify_github_signature(repo.webhook_secret, body, x_hub_signature_256, x_hub_signature)
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid GitHub webhook signature")

    # Handle ping quickly
    if (x_github_event or "").lower() == "ping":
        return {"ok": True, "pong": True}

    # Parse JSON payload and dispatch
    try:
        payload = json.loads(body.decode("utf-8")) if body else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    await handle_github_event(x_github_event or "", payload, repo)
    return {"ok": True}
