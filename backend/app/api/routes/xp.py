from fastapi import APIRouter, Depends
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models import XPEvent, User
from app.schemas.xp import XPEventOut

router = APIRouter(prefix="/xp", tags=["xp"])


@router.get("/events", response_model=List[XPEventOut])
async def list_xp_events(current_user: User = Depends(get_current_user)):
    return await XPEvent.find(XPEvent.person_id == PydanticObjectId(current_user.id)).sort(-XPEvent.created_at).to_list()
