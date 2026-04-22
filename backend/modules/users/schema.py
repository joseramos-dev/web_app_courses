from enum import Enum
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserRole(str, Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"

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
