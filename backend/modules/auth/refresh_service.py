import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from core.security import create_access_token
from core.i18n import http_error
from modules.auth.model import RefreshTokenModel
from modules.users.model import UserModel
from modules.users.service import get_user

REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))

# How long a rotated token keeps working. Two refreshes can overlap for
# perfectly innocent reasons -- the browser fires the second one before the
# first one's new cookie has arrived, which happens on rapid reloads since each
# page load is a fresh JS context and cannot deduplicate against the previous
# one. Without this window the second request presents an already-revoked token
# and the session is torn down.
REFRESH_GRACE_SECONDS = int(os.getenv("REFRESH_GRACE_SECONDS", "20"))


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _as_aware(value: datetime) -> datetime:
    """SQLite (used in tests) hands back naive datetimes even for timezone-aware
    columns, so normalize before comparing."""
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


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


def _purge_expired_tokens(db: Session, user_id: int) -> None:
    """Drop this user's expired tokens. Rows were never deleted, only flagged,
    so the table grew forever (~48 rows a day per active session).

    Keyed on `expires_at`, never on `revoked_at`: a revoked-but-unexpired token
    is exactly what the grace window needs to keep for a few seconds.
    """
    db.query(RefreshTokenModel).filter(
        RefreshTokenModel.user_id == user_id,
        RefreshTokenModel.expires_at < datetime.now(timezone.utc),
    ).delete(synchronize_session="fetch")


def create_token_pair(db: Session, user: UserModel) -> tuple[dict[str, str], str]:
    """Return the JSON body and, separately, the raw refresh token so the route
    can put it in an HttpOnly cookie instead of the response body."""
    access_token = create_access_token(user.id, user.role)
    _purge_expired_tokens(db, user.id)
    refresh_token = _issue_refresh_token(db, user.id)
    db.commit()
    return {"access_token": access_token, "token_type": "bearer"}, refresh_token


def _get_refresh_row_for_rotation(db: Session, raw_token: str) -> RefreshTokenModel:
    """Look up the token, accepting one that was rotated within the grace window.

    Fetched by hash alone -- unique and indexed -- so the revocation check can
    happen in Python, where the naive-datetime normalization already lives.
    """
    row = (
        db.query(RefreshTokenModel)
        .filter(RefreshTokenModel.token_hash == _hash_token(raw_token))
        .first()
    )
    if not row:
        raise http_error(401, "invalid_refresh_token")

    now = datetime.now(timezone.utc)

    # Expiry first: it rules out both paths.
    if _as_aware(row.expires_at) <= now:
        if row.revoked_at is None:
            row.revoked_at = now
            db.commit()
        raise http_error(401, "refresh_token_expired")

    if row.revoked_at is None:
        return row

    if (now - _as_aware(row.revoked_at)).total_seconds() <= REFRESH_GRACE_SECONDS:
        return row

    raise http_error(401, "invalid_refresh_token")


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[dict[str, str], str]:
    """Exchange a refresh token for a new access token and a new refresh token.

    A token accepted through the grace window is rotated like any other, and
    that is what makes the client recover. When navigations pile up, the
    browser cancels the in-flight response before reading its `Set-Cookie`, so
    it keeps presenting the old token while the only live one never reached it.
    Handing back a fresh cookie every time lets it converge; answering without
    one would keep it stuck on a token that dies when the window closes.

    `revoked_at` is only stamped once, so reusing a token cannot keep extending
    its own window.
    """
    row = _get_refresh_row_for_rotation(db, raw_token)
    user = get_user(db, row.user_id)
    if user is None:
        raise http_error(401, "user_not_found")

    if row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
    access_token = create_access_token(user.id, user.role)
    new_refresh = _issue_refresh_token(db, user.id)
    db.commit()
    return {"access_token": access_token, "token_type": "bearer"}, new_refresh


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


def revoke_all_refresh_tokens_for_user(db: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    (
        db.query(RefreshTokenModel)
        .filter(
            RefreshTokenModel.user_id == user_id,
            RefreshTokenModel.revoked_at.is_(None),
        )
        .update({RefreshTokenModel.revoked_at: now}, synchronize_session=False)
    )
