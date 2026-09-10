from typing import Literal

from pydantic import BaseModel


class TokenSchema(BaseModel):
    """The refresh token is never part of the body: it travels in an HttpOnly
    cookie so JavaScript (and therefore an XSS) cannot read it."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"


class ForgotPasswordRequestSchema(BaseModel):
    email: str


class ResetPasswordRequestSchema(BaseModel):
    token: str
    new_password: str


class MessageResponseSchema(BaseModel):
    message: str
