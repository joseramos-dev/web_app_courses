from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.database import get_db
from modules.auth.schema import (
    LogoutRequestSchema,
    RefreshRequestSchema,
    TokenSchema,
)
from modules.auth.refresh_service import (
    create_token_pair,
    revoke_refresh_token,
    rotate_refresh_token,
)
from modules.users.schema import UserSchema, UserSelfUpdateSchema
from modules.users.service import update_self_user
from modules.auth.service import authenticate_user, get_current_user


auth_router = APIRouter(tags=["auth"])


@auth_router.post("/token", response_model=TokenSchema, status_code=status.HTTP_200_OK)
def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    return create_token_pair(db, user)


@auth_router.post(
    "/token/refresh",
    response_model=TokenSchema,
    status_code=status.HTTP_200_OK,
)
def refresh_token(
    payload: RefreshRequestSchema,
    db: Session = Depends(get_db),
):
    return rotate_refresh_token(db, payload.refresh_token)


@auth_router.post("/token/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequestSchema,
    db: Session = Depends(get_db),
):
    revoke_refresh_token(db, payload.refresh_token)


@auth_router.get("/me", response_model=UserSchema, status_code=status.HTTP_200_OK)
def read_me(current_user=Depends(get_current_user)):
    return current_user


@auth_router.patch("/me", response_model=UserSchema, status_code=status.HTTP_200_OK)
def patch_me(
    payload: UserSelfUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return update_self_user(db, current_user, payload)
