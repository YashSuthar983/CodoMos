from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    title: str
    description: Optional[str] = None
    skill_requirements: Optional[Dict[str, int]] = None


class RoleCreate(RoleBase):
    title: str


class RoleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    skill_requirements: Optional[Dict[str, int]] = None


class RoleOut(RoleBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
