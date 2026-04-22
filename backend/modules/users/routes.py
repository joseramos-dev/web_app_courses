from typing import Annotated, List

from fastapi import APIRouter, Depends

from core.database import get_db
from modules.users.schema import UserSchema, UserCreateSchema
from modules.users.service import *


users_router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@users_router.get("/", response_model=List[UserSchema])
def get_users(db: Annotated[Session, Depends(get_db)]):
    """
    Get all users from database
    """
    return get_all_users(db)


@users_router.post("/", response_model=UserSchema)
def add_user(new_user: UserCreateSchema, db: Annotated[Session, Depends(get_db)]):
    """
    Check name and email don't exists, then, it hash the password and add to database
    """
    return add_user_database(db, new_user)


