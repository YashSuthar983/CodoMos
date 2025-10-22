from typing import Optional, Any, Dict, List
from pydantic import BaseModel


class Msg(BaseModel):
    message: str


class Page(BaseModel):
    total: int
    items: List[Any]
