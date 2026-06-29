import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.security import create_access_token
from modules.auth.model import RefreshTokenModel
from modules.users.model import UserModel
from modules.users.service import get_user

REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _issue_refresh_token(db: Session, user_id: int) -> str:
    raw = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)
    row = RefreshTokenModel(
        user_id=user_id,
        token_hash=_hash_token(raw),
        expires_at=expires_at,
    )
    db.add(row)
    db.flush()
    return raw


def create_token_pair(db: Session, user: UserModel) -> dict[str, str]:
    access_token = create_access_token(user.id, user.role)
    refresh_token = _issue_refresh_token(db, user.id)
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def _get_valid_refresh_row(db: Session, raw_token: str) -> RefreshTokenModel:
    token_hash = _hash_token(raw_token)
    row = (
        db.query(RefreshTokenModel)
        .filter(
            RefreshTokenModel.token_hash == token_hash,
            RefreshTokenModel.revoked_at.is_(None),
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    return row


def rotate_refresh_token(db: Session, raw_token: str) -> dict[str, str]:
    row = _get_valid_refresh_row(db, raw_token)
    user = get_user(db, row.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    row.revoked_at = datetime.now(timezone.utc)
    access_token = create_access_token(user.id, user.role)
    new_refresh = _issue_refresh_token(db, user.id)
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    token_hash = _hash_token(raw_token)
    row = (
        db.query(RefreshTokenModel)
        .filter(RefreshTokenModel.token_hash == token_hash)
        .first()
    )
    if row and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
