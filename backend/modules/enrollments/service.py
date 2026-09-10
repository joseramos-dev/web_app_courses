from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, selectinload

from core.i18n import http_error

from modules.courses.model import CourseModel
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.enrollments.schema import EnrollmentDetailSchema
from modules.lessons.model import LessonModel
from modules.progress.model import (
    LessonProgressStatus,
    LessonSubmissionModel,
    SubmissionStatus,
)
from modules.topics.model import TopicModel
from modules.progress.access_service import get_unlocked_lesson_ids


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


def _ordered_lessons(db: Session, course_id: int) -> list[LessonModel]:
    return (
        db.query(LessonModel)
        .join(TopicModel, LessonModel.topic_id == TopicModel.id)
        .filter(LessonModel.course_id == course_id)
        .order_by(TopicModel.position.asc(), LessonModel.position.asc())
        .all()
    )


def _enrollment_progress_maps(enrollment: EnrollmentModel):
    status_by_lesson: dict[int, LessonProgressStatus] = {}
    for lp in enrollment.lesson_progress:
        status_by_lesson[lp.lesson_id] = lp.status
    return status_by_lesson


def build_enrollment_detail(
    db: Session, enrollment: EnrollmentModel, user=None
) -> EnrollmentDetailSchema:
    status_by_lesson = _enrollment_progress_maps(enrollment)
    lessons = _ordered_lessons(db, enrollment.course_id)

    current_lesson_id = None
    for lesson in lessons:
        status = status_by_lesson.get(lesson.id, LessonProgressStatus.NOT_STARTED)
        if status != LessonProgressStatus.COMPLETED:
            current_lesson_id = lesson.id
            break

    pending_rows = (
        db.query(LessonSubmissionModel.lesson_id)
        .filter(
            LessonSubmissionModel.enrollment_id == enrollment.id,
            LessonSubmissionModel.status == SubmissionStatus.PENDING,
        )
        .all()
    )
    pending_review_lesson_ids = [row[0] for row in pending_rows]

    course = (
        db.query(CourseModel).filter(CourseModel.id == enrollment.course_id).first()
    )
    unlocked_ids: set[int] = set()
    if course and user is not None:
        unlocked_ids = get_unlocked_lesson_ids(db, course, user, enrollment)

    base = EnrollmentDetailSchema.model_validate(enrollment, from_attributes=True)
    base.current_lesson_id = current_lesson_id
    base.pending_review_lesson_ids = pending_review_lesson_ids
    base.unlocked_lesson_ids = sorted(unlocked_ids)
    return base


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
    if not course.is_public:
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
