from typing import Annotated, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.i18n import http_error
from modules.auth.service import get_current_user
from modules.enrollments.model import EnrollmentStatus
from modules.enrollments.schema import (
    EnrollmentSchema,
    EnrollmentDetailSchema,
)
from modules.enrollments.service import (
    enroll_user_in_course,
    finalize_enrollment_if_course_has_no_lessons,
    get_enrollment,
    get_enrollment_with_lesson_progress,
    list_my_enrollments,
)
from modules.lessons.model import LessonModel
from modules.users.model import UserRole

enrollments_router = APIRouter(
    prefix="/enrollments",
    tags=["enrollments"],
)


@enrollments_router.post(
    "/{course_id}",
    response_model=EnrollmentSchema,
    status_code=status.HTTP_200_OK,
)
def enroll_in_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """
    Enroll the current user in a course. Only `student` accounts can
    enroll; admins/instructors have their own flows.
    Idempotent: returns the existing row (and reactivates `dropped`
    enrollments) if one is already present.
    """
    if user.role != "student":
        raise http_error(403, "only_students_enroll")
    return enroll_user_in_course(db, user.id, course_id)


@enrollments_router.get("/me", response_model=List[EnrollmentSchema], status_code=status.HTTP_200_OK)
def get_my_enrollments(
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """List the current user's enrollments."""
    return list_my_enrollments(db, user.id)


@enrollments_router.get(
    "/me/course/{course_id}",
    response_model=EnrollmentDetailSchema,
    status_code=status.HTTP_200_OK,
)
def get_my_enrollment_for_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """Enrollment + per-lesson progress for the current user.

    Returns 404 if the user is not enrolled. The frontend uses 404 as
    the signal to render the read-only course view.
    """
    enrollment = get_enrollment_with_lesson_progress(db, user.id, course_id)
    if not enrollment:
        raise http_error(404, "not_enrolled_in_course")
    return enrollment


@enrollments_router.post(
    "/me/course/{course_id}/complete-without-lessons",
    response_model=EnrollmentDetailSchema,
    status_code=status.HTTP_200_OK,
)
def complete_enrollment_without_lessons(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """Mark enrollment completed when the course has no lessons (100% progress)."""
    if user.role != UserRole.STUDENT:
        raise http_error(403, "only_students_complete_enrollment")
    enrollment = get_enrollment(db, user.id, course_id)
    if not enrollment:
        raise http_error(404, "not_enrolled_in_course")
    if enrollment.status == EnrollmentStatus.DROPPED:
        raise http_error(400, "enrollment_not_active")
    lesson_count = (
        db.query(LessonModel)
        .filter(LessonModel.course_id == course_id)
        .count()
    )
    if lesson_count > 0:
        raise http_error(400, "course_has_lessons")
    finalize_enrollment_if_course_has_no_lessons(db, enrollment)
    out = get_enrollment_with_lesson_progress(db, user.id, course_id)
    if not out:
        raise http_error(404, "not_enrolled_in_course")
    return out
