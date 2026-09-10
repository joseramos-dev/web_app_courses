import enum

from sqlalchemy import Column, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, Index
from sqlalchemy.sql import func

from core.database import Base


class NotificationType(str, enum.Enum):
    SUBMISSION = "submission"
    GRADE = "grade"
    NEW_LESSON = "new_lesson"
    LESSON_REMOVED = "lesson_removed"
    COURSE_VISIBILITY = "course_visibility"


class NotificationModel(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(
        SqlEnum(
            NotificationType,
            values_callable=lambda obj: [e.value for e in obj],
            name="notificationtype",
        ),
        nullable=False,
    )
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_notifications_user_id_read_at", "user_id", "read_at"),
    )
