from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models import JobRole, User
from app.schemas.role import RoleCreate, RoleOut, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/", response_model=List[RoleOut])
async def list_roles(current_user: User = Depends(get_current_user)):
    return await JobRole.find_all().sort(-JobRole.created_at).to_list()


@router.post("/", response_model=RoleOut)
async def create_role(payload: RoleCreate, current_user: User = Depends(get_current_user)):
    role = JobRole(title=payload.title, description=payload.description, skill_requirements=payload.skill_requirements)
    await role.insert()
    return role


@router.patch("/{role_id}", response_model=RoleOut)
async def update_role(role_id: str, payload: RoleUpdate, current_user: User = Depends(get_current_user)):
    role = await JobRole.get(PydanticObjectId(role_id))
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(role, field, value)
    await role.save()
    return role


@router.delete("/{role_id}")
async def delete_role(role_id: str, current_user: User = Depends(get_current_user)):
    role = await JobRole.get(PydanticObjectId(role_id))
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await role.delete()
    return {"message": "deleted"}
