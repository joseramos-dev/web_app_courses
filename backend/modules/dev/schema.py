"""Payloads for the development-only bulk import."""

from typing import List, Optional

from pydantic import BaseModel, Field


class UserImportItemSchema(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=255)
    password: Optional[str] = Field(
        default=None,
        description="Defaults to the account's own name.",
    )


class UsersImportSchema(BaseModel):
    """A batch of student accounts.

    Every entry is created as a student: this exists to populate the app with
    test learners, not to manage staff.
    """

    users: List[UserImportItemSchema] = Field(min_length=1, max_length=5000)


class UsersImportResultSchema(BaseModel):
    created: int
    skipped: int
