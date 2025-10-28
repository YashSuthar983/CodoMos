from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, field_serializer


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
    id: Any
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v)
