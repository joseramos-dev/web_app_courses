from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.auth.service import get_current_user
from modules.notifications.schema import (
    NotificationPaginatedSchema,
    NotificationSchema,
    UnreadCountSchema,
)
from modules.notifications.service import (
    count_unread,
    list_notifications,
    mark_all_read,
    mark_read,
)

notifications_router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)


@notifications_router.get(
    "",
    response_model=NotificationPaginatedSchema,
    status_code=status.HTTP_200_OK,
)
def get_notifications(
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    rows, total = list_notifications(db, user.id, limit, offset)
    return NotificationPaginatedSchema(
        notifications=rows,
        total=total,
        limit=limit,
        offset=offset,
    )


@notifications_router.get(
    "/unread_count",
    response_model=UnreadCountSchema,
    status_code=status.HTTP_200_OK,
)
def get_unread_count(
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    return UnreadCountSchema(count=count_unread(db, user.id))


@notifications_router.patch(
    "/{notification_id}/read",
    response_model=NotificationSchema,
    status_code=status.HTTP_200_OK,
)
def read_notification(
    notification_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    row = mark_read(db, user.id, notification_id)
    db.commit()
    db.refresh(row)
    return row


@notifications_router.post(
    "/read-all",
    status_code=status.HTTP_204_NO_CONTENT,
)
def read_all_notifications(
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    mark_all_read(db, user.id)
    db.commit()
