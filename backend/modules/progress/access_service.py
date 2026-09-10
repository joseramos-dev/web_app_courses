from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from core.i18n import http_error
from modules.courses.model import CourseModel, LessonAccessMode
from modules.courses.permissions import is_course_editor
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.lessons.model import LessonModel
from modules.progress.model import LessonProgressModel, LessonProgressStatus
from modules.topics.model import TopicModel
from modules.users.model import UserRole


def _get_enrollment(db: Session, user_id: int, course_id: int) -> EnrollmentModel | None:
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


def _progress_by_lesson(db: Session, enrollment_id: int) -> dict[int, LessonProgressStatus]:
    rows = (
        db.query(LessonProgressModel)
        .filter(LessonProgressModel.enrollment_id == enrollment_id)
        .all()
    )
    return {row.lesson_id: row.status for row in rows}


def get_unlocked_lesson_ids(
    db: Session,
    course: CourseModel,
    user,
    enrollment: Optional[EnrollmentModel] = None,
) -> set[int]:
    lessons = _ordered_lessons(db, course.id)
    if not lessons:
        return set()

    if course.lesson_access_mode == LessonAccessMode.OPEN:
        if user is None:
            return set()
        if is_course_editor(user, course):
            return {l.id for l in lessons}
        if enrollment is None and user.role == UserRole.STUDENT:
            enrollment = _get_enrollment(db, user.id, course.id)
        if enrollment and enrollment.status != EnrollmentStatus.DROPPED:
            return {l.id for l in lessons}
        return set()

    # progressive
    if user is None:
        return set()
    if is_course_editor(user, course):
        return {l.id for l in lessons}
    if enrollment is None:
        enrollment = _get_enrollment(db, user.id, course.id)
    if not enrollment or enrollment.status == EnrollmentStatus.DROPPED:
        return set()

    status_map = _progress_by_lesson(db, enrollment.id)
    unlocked: set[int] = set()
    for idx, lesson in enumerate(lessons):
        if idx == 0:
            unlocked.add(lesson.id)
            continue
        prev = lessons[idx - 1]
        prev_status = status_map.get(prev.id, LessonProgressStatus.NOT_STARTED)
        if prev_status == LessonProgressStatus.COMPLETED:
            unlocked.add(lesson.id)
    return unlocked


def is_lesson_unlocked(
    db: Session,
    course: CourseModel,
    lesson_id: int,
    user,
    enrollment: Optional[EnrollmentModel] = None,
) -> bool:
    return lesson_id in get_unlocked_lesson_ids(db, course, user, enrollment)


def assert_lesson_unlocked(
    db: Session,
    lesson: LessonModel,
    user,
) -> None:
    if user is None:
        raise http_error(401, "could_not_validate_credentials")

    course = db.query(CourseModel).filter(CourseModel.id == lesson.course_id).first()
    if not course:
        raise http_error(404, "course_not_found")

    if is_course_editor(user, course):
        return

    # No free pass for staff of *other* courses. This used to return early for
    # anyone who was not a student, so any instructor could read the content of
    # every course in the catalogue through `GET /lessons/{id}` -- while
    # `get_unlocked_lesson_ids` denied them the same lessons in the course
    # index. Everyone who is not an editor now goes through the enrollment
    # check, and the two functions agree.
    enrollment = _get_enrollment(db, user.id, lesson.course_id)
    if not enrollment or enrollment.status == EnrollmentStatus.DROPPED:
        raise http_error(404, "not_enrolled_in_course")

    if not is_lesson_unlocked(db, course, lesson.id, user, enrollment):
        raise http_error(403, "lesson_locked", error_code="lesson_locked")
