from typing import Literal

from pydantic import BaseModel


class TokenSchema(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"

