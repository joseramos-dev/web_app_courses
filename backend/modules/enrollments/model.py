import enum

from sqlalchemy import (
    Column,
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


class EnrollmentStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DROPPED = "dropped"


class EnrollmentModel(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id = Column(
        Integer,
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        SqlEnum(EnrollmentStatus),
        nullable=False,
        default=EnrollmentStatus.IN_PROGRESS,
        server_default=EnrollmentStatus.IN_PROGRESS.name,
    )
    enrolled_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), nullable=True)

    # Denormalized aggregates for fast dashboard reads.
    # Recomputed when lesson_progress rows change.
    progress_percent = Column(Float, nullable=False, default=0.0, server_default="0")
    completed_lessons_count = Column(
        Integer, nullable=False, default=0, server_default="0"
    )

    lesson_progress = relationship(
        "LessonProgressModel",
        back_populates="enrollment",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_enrollment_user_course"),
    )
