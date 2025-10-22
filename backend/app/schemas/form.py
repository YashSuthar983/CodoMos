from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict, field_serializer


class FormBase(BaseModel):
    name: str
    schema: Dict[str, Any]
    mapping: Optional[Dict[str, Any]] = None
    triggers: Optional[List[Dict[str, Any]]] = None
    published: Optional[bool] = False


class FormCreate(FormBase):
    name: str


class FormUpdate(BaseModel):
    name: Optional[str] = None
    schema: Optional[Dict[str, Any]] = None
    mapping: Optional[Dict[str, Any]] = None
    triggers: Optional[List[Dict[str, Any]]] = None
    published: Optional[bool] = None


class FormOut(FormBase):
    id: Any
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v)


class FormResponseCreate(BaseModel):
    mapped_entity: Optional[Dict[str, Any]] = None
    payload: Dict[str, Any]


class FormResponseOut(BaseModel):
    id: Any
    form_id: Any
    mapped_entity: Optional[Dict[str, Any]] = None
    payload: Dict[str, Any]
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id', 'form_id')
    def serialize_id(self, v):
        return str(v)


# AI-assisted schema generation
class AISchemaRequest(BaseModel):
    description: str
    industry: Optional[str] = None
    audience: Optional[str] = None
    include_fields: Optional[List[str]] = None
    exclude_fields: Optional[List[str]] = None


class AISchemaResponse(BaseModel):
    schema: Dict[str, Any]


class AITriggersRequest(BaseModel):
    use_case: str
    form_schema: Optional[Dict[str, Any]] = None


class AITriggersResponse(BaseModel):
    triggers: List[Dict[str, Any]]
