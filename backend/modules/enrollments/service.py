from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, selectinload

from core.i18n import http_error

from modules.courses.model import CourseModel
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.lessons.model import LessonModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def finalize_enrollment_if_course_has_no_lessons(
    db: Session, enrollment: EnrollmentModel
) -> bool:
    """If the course has zero lessons, mark enrollment completed at 100%.

    Returns True if the row was updated and committed. No-op when the course
    has lessons, enrollment is already completed, or nothing to change.
    """
    n = (
        db.query(LessonModel)
        .filter(LessonModel.course_id == enrollment.course_id)
        .count()
    )
    if n > 0:
        return False
    if enrollment.status == EnrollmentStatus.COMPLETED:
        return False

    enrollment.status = EnrollmentStatus.COMPLETED
    enrollment.progress_percent = 100.0
    enrollment.completed_lessons_count = 0
    enrollment.completed_at = _utcnow()
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return True


def get_enrollment(
    db: Session, user_id: int, course_id: int
) -> Optional[EnrollmentModel]:
    return (
        db.query(EnrollmentModel)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.course_id == course_id,
        )
        .first()
    )


def get_enrollment_with_lesson_progress(
    db: Session, user_id: int, course_id: int
) -> Optional[EnrollmentModel]:
    """Same as get_enrollment but eager-loads lesson_progress for API responses."""
    return (
        db.query(EnrollmentModel)
        .options(selectinload(EnrollmentModel.lesson_progress))
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.course_id == course_id,
        )
        .first()
    )


def list_my_enrollments(db: Session, user_id: int):
    return (
        db.query(EnrollmentModel)
        .filter(EnrollmentModel.user_id == user_id)
        .order_by(EnrollmentModel.last_activity_at.desc().nullslast())
        .all()
    )


def enroll_user_in_course(
    db: Session, user_id: int, course_id: int
) -> EnrollmentModel:
    """Idempotent enroll: creates a new enrollment, or reactivates a
    `dropped` one. Existing `in_progress`/`completed` rows are returned as-is.
    """
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise http_error(404, "course_not_found")

    existing = get_enrollment(db, user_id, course_id)
    if existing:
        if existing.status == EnrollmentStatus.DROPPED:
            existing.status = EnrollmentStatus.IN_PROGRESS
            db.add(existing)
            db.commit()
            db.refresh(existing)
        finalize_enrollment_if_course_has_no_lessons(db, existing)
        return existing

    enrollment = EnrollmentModel(
        user_id=user_id,
        course_id=course_id,
        status=EnrollmentStatus.IN_PROGRESS,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    finalize_enrollment_if_course_has_no_lessons(db, enrollment)
    return enrollment
