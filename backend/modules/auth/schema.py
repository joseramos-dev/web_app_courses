from typing import Literal

from pydantic import BaseModel, Field
from modules.users.schema import UserRole


class TokenSchema(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class CurrentUserSchema(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole

    class Config:
        from_attributes = True
