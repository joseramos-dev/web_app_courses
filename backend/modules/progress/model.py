import enum

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SqlEnum,
    Float,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class LessonProgressStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class LessonProgressModel(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(
        Integer,
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        SqlEnum(LessonProgressStatus),
        nullable=False,
        default=LessonProgressStatus.NOT_STARTED,
        server_default=LessonProgressStatus.NOT_STARTED.name,
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), nullable=True)

    # Lesson-type-specific metrics. Kept as flat columns instead of a
    # polymorphic JSON to keep queries simple and indexable.
    watched_seconds = Column(
        Integer, nullable=False, default=0, server_default="0"
    )  # used by LessonType.VIDEO
    best_score = Column(
        Float, nullable=True
    )  # 0-100, used by LessonType.TEST / MULTIPLE_SELECTION
    attempts = Column(Integer, nullable=False, default=0, server_default="0")

    enrollment = relationship("EnrollmentModel", back_populates="lesson_progress")
    lesson = relationship("LessonModel")

    __table_args__ = (
        UniqueConstraint(
            "enrollment_id", "lesson_id", name="uq_progress_enrollment_lesson"
        ),
    )


class StudyActivityModel(Base):
    """Daily aggregate of a student's study activity.

    One row per (user_id, activity_date). Updates use an upsert pattern that
    increments counters for the current day. Powers dashboard heatmaps,
    streaks and weekly study-time charts.
    """

    __tablename__ = "study_activity"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_date = Column(Date, nullable=False, index=True)
    seconds_studied = Column(
        Integer, nullable=False, default=0, server_default="0"
    )
    lessons_completed = Column(
        Integer, nullable=False, default=0, server_default="0"
    )
    lessons_started = Column(
        Integer, nullable=False, default=0, server_default="0"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_activity_user_date"),
    )
