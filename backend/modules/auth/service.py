from datetime import datetime, timedelta, timezone
from operator import or_
import os
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends
from sqlalchemy.orm import Session

from jose import jwt, JWTError

from modules.users.model import UserModel
from modules.users.service import get_user
from core.security import oauth2_scheme, verify_password
from core.database import get_db
from core.i18n import ERROR_CODES, http_error

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# Login lockout: after this many consecutive failed attempts, the account is
# locked for LOCKOUT_MINUTES. Counter resets on a successful login.
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def get_user_by_name_or_email(db: Session, nameOrEmail: str):
    user = (
        db.query(UserModel)
        .filter(
            or_(
                UserModel.name == nameOrEmail,
                UserModel.email == nameOrEmail,
            )
        )
        .first()
    )
    if not user:
        raise http_error(401, "user_not_found")
    return user


def authenticate_user(db: Session, name_or_email: str, password: str) -> UserModel:
    """Verify credentials, enforcing a per-account lockout after too many
    consecutive failed attempts."""
    user = get_user_by_name_or_email(db, name_or_email)
    now = datetime.now(timezone.utc)

    # Some backends (e.g. SQLite, used in tests) return naive datetimes even
    # for timezone-aware columns; normalize before comparing (same pattern
    # as refresh_service._get_valid_refresh_row).
    locked_until = user.locked_until
    if locked_until is not None and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until is not None and locked_until > now:
        remaining_minutes = max(1, int((locked_until - now).total_seconds() // 60) + 1)
        raise http_error(423, "account_locked", minutes=remaining_minutes)

    if not verify_password(password, user.hash_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        locked_now = user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS
        if locked_now:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
        db.commit()

        if locked_now:
            raise http_error(423, "account_locked", minutes=LOCKOUT_MINUTES)
        raise http_error(
            401,
            "invalid_credentials",
            error_code=ERROR_CODES["invalid_credentials"],
        )

    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int( payload.get("sub") )
    except (ValueError, TypeError):
        raise http_error(401, "invalid_token")
    except JWTError:
        raise http_error(
            401,
            "could_not_validate_credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user(db, user_id)
    if user is None:
        raise http_error(401, "user_not_found")

    return user
