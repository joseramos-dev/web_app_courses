import enum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum as SqlEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
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


class LessonAttemptModel(Base):
    __tablename__ = "lesson_attempts"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(
        Integer,
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
    )
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    score = Column(Float, nullable=False)
    passed = Column(Boolean, nullable=False, default=False, server_default="false")
    attempted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    enrollment = relationship("EnrollmentModel")
    lesson = relationship("LessonModel")

    __table_args__ = (
        Index(
            "ix_lesson_attempts_enrollment_lesson_at",
            "enrollment_id",
            "lesson_id",
            "attempted_at",
        ),
    )


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    GRADED = "graded"
    RETURNED = "returned"


class LessonSubmissionModel(Base):
    __tablename__ = "lesson_submissions"

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
    body = Column(Text, nullable=True)
    file_id = Column(
        Integer,
        ForeignKey("lesson_files.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(
        SqlEnum(SubmissionStatus),
        nullable=False,
        default=SubmissionStatus.PENDING,
        server_default=SubmissionStatus.PENDING.name,
    )
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    submitted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    graded_at = Column(DateTime(timezone=True), nullable=True)
    graded_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    enrollment = relationship("EnrollmentModel")
    lesson = relationship("LessonModel")
    file = relationship("LessonFileModel")
    grader = relationship("UserModel", foreign_keys=[graded_by])

    __table_args__ = (
        UniqueConstraint(
            "enrollment_id", "lesson_id", name="uq_submission_enrollment_lesson"
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
