from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.config import ENABLE_DEV_ROUTES
from core.i18n import http_error
from modules.users.schema import UserSchema, UserCreateSchema
from modules.users.model import UserRole
from modules.users.service import (
    add_user_database,
    count_admins,
    create_bootstrap_admin,
    delete_user_database,
    get_all_users,
    update_user_role_database,
)
from core.dependencies import require_role


users_router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@users_router.get("/", response_model=List[UserSchema], status_code=status.HTTP_200_OK)
def get_users(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
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
    Public registration. Admin role is rejected in the service layer.
    """
    return add_user_database(db, new_user)


@users_router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user=Depends(require_role(["admin"])),
):
    """
    Delete the user that has the id of the parameter. Admin only.
    """
    if current_user.id == user_id:
        raise http_error(403, "cannot_delete_self")
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
    current_user=Depends(require_role(["admin"])),
):
    if current_user.id == user_id and role != UserRole.ADMIN:
        raise http_error(403, "cannot_remove_own_admin")
    return update_user_role_database(db, user_id, role)


if ENABLE_DEV_ROUTES:

    @users_router.post("/bootstrap_admin", status_code=status.HTTP_200_OK)
    def bootstrap_admin(
        db: Annotated[Session, Depends(get_db)],
    ):
        """
        Development only: create or restore the default admin when none exist.
        """
        if count_admins(db) > 0:
            raise http_error(403, "admin_already_exists")

        return create_bootstrap_admin(db)
