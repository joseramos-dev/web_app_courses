from typing import Literal

from pydantic import BaseModel


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class RefreshRequestSchema(BaseModel):
    refresh_token: str


class LogoutRequestSchema(BaseModel):
    refresh_token: str
