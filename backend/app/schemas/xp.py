from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, field_serializer


class XPEventOut(BaseModel):
    id: Any
    person_id: Any
    source: str
    amount: int
    skill_distribution: Optional[Dict[str, float]] = None
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v)

    @field_serializer('person_id')
    def serialize_person_id(self, v):
        return str(v)
