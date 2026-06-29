from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.config import ENABLE_DEV_ROUTES
from modules.auth.service import get_optional_current_user
from modules.users.model import UserModel, UserRole
from modules.users.schema import UserSchema, UserCreateSchema
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
    _user=Depends(require_role(["admin"])),
):
    """
    Delete the user that has the id of the parameter. Admin only.
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
    _user=Depends(require_role(["admin"])),
):
    return update_user_role_database(db, user_id, role)


if ENABLE_DEV_ROUTES:

    @users_router.post("/create_admin", status_code=status.HTTP_200_OK)
    def create_admin(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[
            Optional[UserModel], Depends(get_optional_current_user)
        ] = None,
    ):
        """
        Development only: bootstrap the first admin when none exist;
        otherwise requires an authenticated admin.
        """
        if count_admins(db) > 0:
            if current_user is None or current_user.role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=403,
                    detail="Admin already exists; authenticate as admin to create another",
                )

        return create_bootstrap_admin(db)
