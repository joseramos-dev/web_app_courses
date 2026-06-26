from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.users.model import UserRole
from modules.users.schema import UserSchema, UserCreateSchema
from modules.users.service import *
from core.dependencies import require_role


users_router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@users_router.get("/", response_model=List[UserSchema], status_code=status.HTTP_200_OK)
def get_users(
    db: Annotated[Session, Depends(get_db)],
    role: Optional[UserRole] = Query(
        None,
        description="Optional role filter (e.g. 'instructor' to populate pickers).",
    ),
):
    """
    Get users from database, optionally filtered by role.
    """
    return get_all_users(db, role=role)


@users_router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def add_user(new_user: UserCreateSchema, db: Annotated[Session, Depends(get_db)]):
    """
    Check name and email don't exists, then, it hash the password and add to database
    """
    return add_user_database(db, new_user)

@users_router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(user_id: int, db: Annotated[Session, Depends(get_db)]):
    """
    Delete the user that has the id of the parameter
    """
    return delete_user_database(db, user_id)


@users_router.patch(
    "/{user_id}/role/{role}",
    response_model=UserSchema,
    status_code=status.HTTP_200_OK,
)
def update_user_role(
    user_id: int, 
    role: UserRole, 
    db: Annotated[Session, Depends(get_db)],
    _ = Depends(require_role(["admin"]))
    ):
    return update_user_role_database(db, user_id, role)


#TODO: ESTO SOLO LO USAREMOS DURANTE EL DESARROLLO, BORRAR AL TERMINAR
@users_router.post("/create_admin", status_code=status.HTTP_200_OK)
def create_admin(db :Annotated[Session, Depends(get_db)]):
    admin = UserCreateSchema(name="admin", email="admin@admin", password="admin", role="admin")
    add_user_database(db, admin)

