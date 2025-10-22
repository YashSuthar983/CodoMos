from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict


class XPEventOut(BaseModel):
    id: str
    person_id: str
    source: str
    amount: int
    skill_distribution: Optional[Dict[str, float]] = None
    model_config = ConfigDict(from_attributes=True)
