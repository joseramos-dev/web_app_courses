from typing import Annotated, Optional

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from modules.auth.service import get_current_user
from modules.lessons.schema import LessonAnswerSubmitSchema
from modules.progress.schema import (
    LessonCompleteResultSchema,
    LessonProgressSchema,
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
    "/lesson/{lesson_id}", response_model=LessonProgressSchema
)
def get_progress(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    return get_lesson_progress(db, user.id, lesson_id)


@progress_router.post(
    "/lesson/{lesson_id}/start", response_model=LessonProgressSchema
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
    "/lesson/{lesson_id}/complete", response_model=LessonCompleteResultSchema
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
