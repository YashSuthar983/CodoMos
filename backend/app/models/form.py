from datetime import datetime
from typing import Optional, Any, Dict, List
from beanie import Document
from beanie import PydanticObjectId
from pydantic import Field


class Form(Document):
    name: str
    schema: Dict[str, Any]
    mapping: Optional[Dict[str, Any]] = None
    triggers: Optional[List[Dict[str, Any]]] = None
    published: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "forms"


class FormResponse(Document):
    form_id: PydanticObjectId
    mapped_entity: Optional[Dict[str, Any]] = None  # {type, id}
    payload: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "form_responses"
