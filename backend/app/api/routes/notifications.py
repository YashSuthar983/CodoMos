from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: str
    category: str
    message: Optional[str]
    resource_id: Optional[str]
    metadata: dict
    read: bool
    created_at: str


@router.get("/", response_model=List[NotificationOut])
async def list_notifications(
    read: Optional[bool] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
):
    q = Notification.find(Notification.user.id == user.id)  # type: ignore
    if read is not None:
        q = q.find(Notification.read == read)
    if category:
        q = q.find(Notification.category == category)
    docs = await q.sort(-Notification.created_at).skip(offset).limit(limit).to_list()
    return [
        NotificationOut(
            id=str(n.id),
            category=n.category,
            message=n.message,
            resource_id=n.resource_id,
            metadata=n.metadata,
            read=n.read,
            created_at=n.created_at.isoformat(),
        )
        for n in docs
    ]


@router.post("/{notification_id}/read", response_model=dict)
async def mark_read(notification_id: str, user: User = Depends(get_current_user)):
    n = await Notification.get(notification_id)
    if not n or str(n.user.id) != str(user.id):  # type: ignore
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    await n.save()
    return {"status": "ok"}


@router.post("/{notification_id}/unread", response_model=dict)
async def mark_unread(notification_id: str, user: User = Depends(get_current_user)):
    n = await Notification.get(notification_id)
    if not n or str(n.user.id) != str(user.id):  # type: ignore
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = False
    await n.save()
    return {"status": "ok"}


@router.post("/mark_all_read", response_model=dict)
async def mark_all_read(user: User = Depends(get_current_user)):
    await Notification.find(Notification.user.id == user.id).update({"$set": {"read": True}})  # type: ignore
    return {"status": "ok"}


class PreferenceUpdate(BaseModel):
    inapp_mention: Optional[bool] = None
    inapp_announcement: Optional[bool] = None
    inapp_task_assignment: Optional[bool] = None
    inapp_leave: Optional[bool] = None
    inapp_review_reminder: Optional[bool] = None
    inapp_project_update: Optional[bool] = None

    email_task_assignment: Optional[bool] = None
    email_leave: Optional[bool] = None
    email_review_reminder: Optional[bool] = None
    email_project_update: Optional[bool] = None


@router.get("/preferences", response_model=dict)
async def get_preferences(user: User = Depends(get_current_user)):
    prefs = await NotificationPreference.find_one(NotificationPreference.user.id == user.id)  # type: ignore
    if not prefs:
        prefs = NotificationPreference(user=user)
        await prefs.insert()
    return prefs.model_dump(by_alias=True)


@router.patch("/preferences", response_model=dict)
async def update_preferences(payload: PreferenceUpdate, user: User = Depends(get_current_user)):
    prefs = await NotificationPreference.find_one(NotificationPreference.user.id == user.id)  # type: ignore
    if not prefs:
        prefs = NotificationPreference(user=user)
    data = payload.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(prefs, k, v)
    await prefs.save()
    return prefs.model_dump(by_alias=True)
