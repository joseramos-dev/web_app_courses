from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.database import get_db
from modules.auth.schema import TokenSchema
from modules.users.schema import UserSchema, UserSelfUpdateSchema
from modules.users.service import update_self_user
from modules.auth.service import get_current_user, get_user_by_name_or_email
from core.security import verify_password, create_access_token


auth_router = APIRouter(tags=["auth"])


@auth_router.post("/token", status_code=status.HTTP_200_OK)
def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_name_or_email(db, form_data.username)
    if not verify_password(form_data.password, user.hash_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id, user.role)
    return TokenSchema(access_token=token)


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

