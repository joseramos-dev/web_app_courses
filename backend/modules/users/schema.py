from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from modules.users.model import UserRole


class UserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: UserRole
    time_creation: datetime


class UserCreateSchema(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole


class UserSelfUpdateSchema(BaseModel):
    """Partial self-service profile update. Sensitive changes require current_password."""

    name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = Field(
        default=None,
        description="Required when changing email or password.",
    )
    new_password: Optional[str] = Field(
        default=None,
        description="New password; requires current_password.",
    )
