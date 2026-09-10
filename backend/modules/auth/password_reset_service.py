"""Password reset token lifecycle: request, validate, consume."""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from core.email import send_password_reset_email
from core.i18n import http_error, msg
from core.security import hash_password
from modules.auth.model import PasswordResetTokenModel
from modules.auth.refresh_service import revoke_all_refresh_tokens_for_user
from modules.users.model import UserModel
from modules.users.service import check_email_exists

RESET_TOKEN_MINUTES = int(os.getenv("RESET_TOKEN_MINUTES", "30"))
MIN_PASSWORD_LENGTH = 8


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def _normalize_expires(expires_at: datetime) -> datetime:
    if expires_at.tzinfo is None:
        return expires_at.replace(tzinfo=timezone.utc)
    return expires_at


def request_password_reset(db: Session, email: str) -> dict[str, str]:
    """Always returns the same message; only sends email if user exists.

    Abuse is throttled by the rate limit on the route (see auth/routes.py),
    which replaced a per-email cooldown dict that grew without bound.
    """
    normalized = email.strip().lower()
    user = check_email_exists(db, normalized)
    if user is None:
        # Also try original casing in case emails were stored mixed-case.
        user = db.query(UserModel).filter(UserModel.email == email.strip()).first()
    if user is None:
        return {"message": msg("password_reset_requested")}

    db.query(PasswordResetTokenModel).filter(
        PasswordResetTokenModel.user_id == user.id
    ).delete(synchronize_session=False)

    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_MINUTES)
    row = PasswordResetTokenModel(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()

    reset_url = f"{_frontend_url()}/?reset_token={raw_token}"
    send_password_reset_email(user.email, reset_url)

    return {"message": msg("password_reset_requested")}


def reset_password(db: Session, token: str, new_password: str) -> dict[str, str]:
    if len(new_password) < MIN_PASSWORD_LENGTH:
        raise http_error(400, "password_too_short", min_length=MIN_PASSWORD_LENGTH)

    token_hash = _hash_token(token)
    row = (
        db.query(PasswordResetTokenModel)
        .filter(PasswordResetTokenModel.token_hash == token_hash)
        .first()
    )
    if row is None:
        raise http_error(400, "reset_token_invalid")

    expires_at = _normalize_expires(row.expires_at)
    now = datetime.now(timezone.utc)
    if expires_at <= now:
        db.delete(row)
        db.commit()
        raise http_error(400, "reset_token_expired")

    user = db.query(UserModel).filter(UserModel.id == row.user_id).first()
    if user is None:
        db.delete(row)
        db.commit()
        raise http_error(400, "reset_token_invalid")

    user.hash_password = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.delete(row)
    revoke_all_refresh_tokens_for_user(db, user.id)
    db.commit()

    return {"message": msg("password_reset_success")}
