from typing import Annotated, Optional

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.auth.service import get_current_user
from modules.lessons.schema import LessonAnswerSubmitSchema
from modules.progress.performance_schema import (
    LessonAttemptListSchema,
    StudentPerformanceSchema,
)
from modules.progress.performance_service import (
    get_student_performance,
    list_lesson_attempts,
)
from modules.progress.schema import (
    LessonCompleteResultSchema,
    LessonProgressSchema,
)
from modules.progress.submission_schema import (
    AssignmentSubmitSchema,
    GradeSubmissionResultSchema,
    GradeSubmissionSchema,
    SubmissionListSchema,
    SubmissionSchema,
)
from modules.progress.submission_service import (
    get_submission,
    grade_submission,
    submit_assignment,
)
from modules.progress.service import (
    complete_lesson,
    get_lesson_progress,
    start_lesson,
)
from modules.enrollments.model import EnrollmentStatus

progress_router = APIRouter(
    prefix="/progress",
    tags=["progress"],
)


@progress_router.get(
    "/me/performance",
    response_model=StudentPerformanceSchema,
    status_code=status.HTTP_200_OK,
)
def get_my_performance(
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    return get_student_performance(db, user.id)


@progress_router.get(
    "/lesson/{lesson_id}/attempts",
    response_model=LessonAttemptListSchema,
    status_code=status.HTTP_200_OK,
)
def get_lesson_attempts(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    return list_lesson_attempts(db, user.id, lesson_id)


@progress_router.get(
    "/lesson/{lesson_id}",
    response_model=LessonProgressSchema,
    status_code=status.HTTP_200_OK,
)
def get_progress(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    return get_lesson_progress(db, user.id, lesson_id)


@progress_router.post(
    "/lesson/{lesson_id}/start",
    response_model=LessonProgressSchema,
    status_code=status.HTTP_200_OK,
)
def start(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """Mark the lesson as started for the current user.

    Used by the lesson page on mount to build the IN_PROGRESS state and
    bump today's study activity counter.
    """
    return start_lesson(db, user.id, lesson_id)


@progress_router.post(
    "/lesson/{lesson_id}/complete",
    response_model=LessonCompleteResultSchema,
    status_code=status.HTTP_200_OK,
)
def complete(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
    payload: Optional[LessonAnswerSubmitSchema] = Body(default=None),
):
    """Mark the lesson as completed.

    Body is required for TEST / MULTIPLE_SELECTION lessons (list of
    selected option ids per question) and ignored for TEXT / VIDEO.
    """
    answers = payload.answers if payload else []
    lp, enrollment, passed, score = complete_lesson(
        db, user.id, lesson_id, answers
    )
    return LessonCompleteResultSchema(
        passed=passed,
        score=score,
        lesson_progress=lp,
        enrollment_progress_percent=enrollment.progress_percent,
        enrollment_completed=enrollment.status == EnrollmentStatus.COMPLETED,
    )


@progress_router.post(
    "/lesson/{lesson_id}/submit",
    response_model=SubmissionSchema,
    status_code=status.HTTP_200_OK,
)
def submit_lesson_assignment(
    lesson_id: int,
    payload: AssignmentSubmitSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """Submit or resubmit an assignment (text and/or file path)."""
    return submit_assignment(
        db,
        user.id,
        lesson_id,
        payload.body,
        payload.file_id,
    )


@progress_router.get(
    "/lesson/{lesson_id}/submission",
    response_model=SubmissionSchema,
    status_code=status.HTTP_200_OK,
)
def get_lesson_submission(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """Return the current user's submission for an assignment lesson."""
    return get_submission(db, user.id, lesson_id)
