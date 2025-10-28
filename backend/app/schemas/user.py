from typing import Optional, Any
from pydantic import BaseModel, EmailStr, ConfigDict, field_serializer


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    github_username: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    github_username: Optional[str] = None
    github_pat: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(UserBase):
    id: Any
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
