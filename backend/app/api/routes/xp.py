from fastapi import APIRouter, Depends
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models import XPEvent, User
from app.schemas.xp import XPEventOut

router = APIRouter(prefix="/xp", tags=["xp"])


@router.get("/events", response_model=List[XPEventOut])
async def list_xp_events(current_user: User = Depends(get_current_user)):
    docs = await XPEvent.find(XPEvent.person_id == PydanticObjectId(current_user.id)).sort(-XPEvent.created_at).to_list()
    # Explicitly build response models to ensure proper serialization of ObjectIds
    return [
        XPEventOut(
            id=str(d.id),
            person_id=str(d.person_id),
            source=d.source,
            amount=d.amount,
            skill_distribution=d.skill_distribution,
        )
        for d in docs
    ]
