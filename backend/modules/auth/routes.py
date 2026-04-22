from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.database import get_db
from modules.auth.schema import CurrentUserSchema, TokenSchema
from modules.auth.service import get_current_user, get_user_by_name_or_email
from core.security import verify_password, create_access_token


auth_router = APIRouter(tags=["auth"])


@auth_router.post("/token")
def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_name_or_email(db, form_data.username)
    if not verify_password(form_data.password, user.hash_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id, user.role)
    return TokenSchema(access_token=token)


@auth_router.get("/me", response_model=CurrentUserSchema)
def read_me(current_user=Depends(get_current_user)):
    return current_user

