from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.config import COOKIE_DOMAIN, COOKIE_SAMESITE, COOKIE_SECURE
from core.database import get_db
from core.i18n import http_error
from core.rate_limit import limiter
from modules.auth.schema import (
    ForgotPasswordRequestSchema,
    MessageResponseSchema,
    ResetPasswordRequestSchema,
    TokenSchema,
)
from modules.auth.password_reset_service import (
    request_password_reset,
    reset_password,
)
from modules.auth.refresh_service import (
    REFRESH_TOKEN_DAYS,
    create_token_pair,
    revoke_refresh_token,
    rotate_refresh_token,
)
from modules.users.schema import UserSchema, UserSelfUpdateSchema
from modules.users.service import update_self_user
from modules.auth.service import authenticate_user, get_current_user


auth_router = APIRouter(tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
# Scoped to /token so the cookie is only ever sent to the three session
# endpoints, never to the rest of the API.
_COOKIE_PATH = "/token"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=_COOKIE_PATH,
    )


@auth_router.post("/token", response_model=TokenSchema, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
def token(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Log in. The access token is returned in the body (the client keeps it in
    memory); the refresh token is set as an HttpOnly cookie."""
    user = authenticate_user(db, form_data.username, form_data.password)
    body, refresh_token_value = create_token_pair(db, user)
    _set_refresh_cookie(response, refresh_token_value)
    return body


@auth_router.post(
    "/token/refresh",
    response_model=TokenSchema,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("30/minute")
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
):
    """Exchange the refresh cookie for a new access token, rotating the cookie."""
    if not refresh_token:
        raise http_error(401, "invalid_refresh_token")
    body, new_refresh = rotate_refresh_token(db, refresh_token)
    _set_refresh_cookie(response, new_refresh)
    return body


@auth_router.post("/token/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
):
    """Revoke the refresh token and drop the cookie. Idempotent."""
    if refresh_token:
        revoke_refresh_token(db, refresh_token)
    _clear_refresh_cookie(response)


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


@auth_router.post(
    "/auth/forgot-password",
    response_model=MessageResponseSchema,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("3/hour")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequestSchema,
    db: Session = Depends(get_db),
):
    return request_password_reset(db, payload.email)


@auth_router.post(
    "/auth/reset-password",
    response_model=MessageResponseSchema,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("10/hour")
def reset_password_route(
    request: Request,
    payload: ResetPasswordRequestSchema,
    db: Session = Depends(get_db),
):
    return reset_password(db, payload.token, payload.new_password)
