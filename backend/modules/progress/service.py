from datetime import date, datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.i18n import http_error

from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.lessons.model import (
    AnswerOptionModel,
    LessonModel,
    LessonType,
    QuestionModel,
)
from modules.lessons.schema import LessonAnswerSchema
from modules.progress.model import (
    LessonAttemptModel,
    LessonProgressModel,
    LessonProgressStatus,
    StudyActivityModel,
)


PASSING_SCORE = 70.0  # percent threshold for TEST / MULTIPLE_SELECTION


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _require_lesson(db: Session, lesson_id: int) -> LessonModel:
    lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if not lesson:
        raise http_error(404, "lesson_not_found")
    return lesson


def _require_enrollment(
    db: Session, user_id: int, course_id: int
) -> EnrollmentModel:
    enrollment = (
        db.query(EnrollmentModel)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.course_id == course_id,
        )
        .first()
    )
    if not enrollment:
        raise http_error(404, "not_enrolled_in_course")
    return enrollment


def _get_or_create_lesson_progress(
    db: Session, enrollment_id: int, lesson_id: int
) -> LessonProgressModel:
    lp = (
        db.query(LessonProgressModel)
        .filter(
            LessonProgressModel.enrollment_id == enrollment_id,
            LessonProgressModel.lesson_id == lesson_id,
        )
        .first()
    )
    if lp:
        return lp
    lp = LessonProgressModel(
        enrollment_id=enrollment_id,
        lesson_id=lesson_id,
        status=LessonProgressStatus.NOT_STARTED,
    )
    try:
        # Nested transaction (SAVEPOINT): if a concurrent request already
        # created this row (e.g. two lesson-start requests fired right after
        # enrolling), only this insert is rolled back, not the whole
        # transaction, so we can fall back to the row it created.
        with db.begin_nested():
            db.add(lp)
            db.flush()
    except IntegrityError:
        lp = (
            db.query(LessonProgressModel)
            .filter(
                LessonProgressModel.enrollment_id == enrollment_id,
                LessonProgressModel.lesson_id == lesson_id,
            )
            .first()
        )
        if lp is None:
            raise
    return lp


def _bump_study_activity(
    db: Session,
    user_id: int,
    *,
    started: bool = False,
    completed: bool = False,
    seconds: int = 0,
) -> None:
    today = date.today()
    row = (
        db.query(StudyActivityModel)
        .filter(
            StudyActivityModel.user_id == user_id,
            StudyActivityModel.activity_date == today,
        )
        .first()
    )
    if not row:
        row = StudyActivityModel(
            user_id=user_id,
            activity_date=today,
            seconds_studied=0,
            lessons_started=0,
            lessons_completed=0,
        )
        try:
            with db.begin_nested():
                db.add(row)
                db.flush()
        except IntegrityError:
            row = (
                db.query(StudyActivityModel)
                .filter(
                    StudyActivityModel.user_id == user_id,
                    StudyActivityModel.activity_date == today,
                )
                .first()
            )
            if row is None:
                raise
    if started:
        row.lessons_started = (row.lessons_started or 0) + 1
    if completed:
        row.lessons_completed = (row.lessons_completed or 0) + 1
    if seconds:
        row.seconds_studied = (row.seconds_studied or 0) + seconds
    db.flush()


def _recalc_enrollment_progress(
    db: Session, enrollment: EnrollmentModel
) -> None:
    # The session has autoflush disabled, so the caller's pending change
    # (e.g. marking `lp.status = COMPLETED` just before calling this) is not
    # yet visible to the COUNT query below. Without this flush, the lesson
    # that was just completed is excluded from its own recalculation, so a
    # course could never reach 100% / COMPLETED.
    db.flush()
    total_lessons = (
        db.query(LessonModel)
        .filter(LessonModel.course_id == enrollment.course_id)
        .count()
    )
    completed = (
        db.query(LessonProgressModel)
        .filter(
            LessonProgressModel.enrollment_id == enrollment.id,
            LessonProgressModel.status == LessonProgressStatus.COMPLETED,
        )
        .count()
    )
    enrollment.completed_lessons_count = completed
    enrollment.progress_percent = (
        (completed / total_lessons) * 100.0 if total_lessons > 0 else 0.0
    )
    if total_lessons > 0 and completed >= total_lessons:
        enrollment.status = EnrollmentStatus.COMPLETED
        enrollment.completed_at = _now()
    db.flush()


# ---------- Public API ----------

def get_lesson_progress(
    db: Session, user_id: int, lesson_id: int
) -> LessonProgressModel:
    lesson = _require_lesson(db, lesson_id)
    enrollment = _require_enrollment(db, user_id, lesson.course_id)
    lp = (
        db.query(LessonProgressModel)
        .filter(
            LessonProgressModel.enrollment_id == enrollment.id,
            LessonProgressModel.lesson_id == lesson_id,
        )
        .first()
    )
    if not lp:
        raise http_error(404, "no_progress_for_lesson")
    return lp


def start_lesson(
    db: Session, user_id: int, lesson_id: int
) -> LessonProgressModel:
    lesson = _require_lesson(db, lesson_id)
    enrollment = _require_enrollment(db, user_id, lesson.course_id)

    lp = _get_or_create_lesson_progress(db, enrollment.id, lesson_id)
    now = _now()
    if lp.status == LessonProgressStatus.NOT_STARTED:
        lp.status = LessonProgressStatus.IN_PROGRESS
        lp.started_at = now
        _bump_study_activity(db, user_id, started=True)
    lp.last_activity_at = now

    if enrollment.started_at is None:
        enrollment.started_at = now
    enrollment.last_activity_at = now

    db.commit()
    db.refresh(lp)
    return lp


def _grade_test(
    db: Session,
    lesson: LessonModel,
    answers: List[LessonAnswerSchema],
) -> float:
    """Return score 0-100. A question is correct iff the student selected
    exactly the set of options flagged `is_correct` (no missing, no extras)."""
    questions = (
        db.query(QuestionModel)
        .filter(QuestionModel.lesson_id == lesson.id)
        .all()
    )
    if not questions:
        return 100.0  # no questions configured = trivially passed

    answers_by_qid = {a.question_id: set(a.selected_option_ids) for a in answers}
    correct_count = 0
    for q in questions:
        correct_ids = {opt.id for opt in q.options if opt.is_correct}
        selected = answers_by_qid.get(q.id, set())
        if correct_ids and selected == correct_ids:
            correct_count += 1

    return (correct_count / len(questions)) * 100.0


def complete_lesson(
    db: Session,
    user_id: int,
    lesson_id: int,
    answers: Optional[List[LessonAnswerSchema]] = None,
) -> Tuple[LessonProgressModel, EnrollmentModel, bool, Optional[float]]:
    lesson = _require_lesson(db, lesson_id)
    enrollment = _require_enrollment(db, user_id, lesson.course_id)

    lp = _get_or_create_lesson_progress(db, enrollment.id, lesson_id)
    now = _now()
    lp.last_activity_at = now
    if lp.started_at is None:
        lp.started_at = now

    score: Optional[float] = None
    if lesson.lesson_type in (LessonType.TEST, LessonType.MULTIPLE_SELECTION):
        score = _grade_test(db, lesson, answers or [])
        passed = score >= PASSING_SCORE
        lp.attempts = (lp.attempts or 0) + 1
        lp.best_score = max(lp.best_score or 0.0, score)
        db.add(
            LessonAttemptModel(
                enrollment_id=enrollment.id,
                lesson_id=lesson_id,
                score=score,
                passed=passed,
                attempted_at=now,
            )
        )
    else:
        passed = True

    was_already_completed = lp.status == LessonProgressStatus.COMPLETED

    if passed:
        lp.status = LessonProgressStatus.COMPLETED
        if lp.completed_at is None:
            lp.completed_at = now
        _recalc_enrollment_progress(db, enrollment)
        if not was_already_completed:
            _bump_study_activity(db, user_id, completed=True)
    else:
        if lp.status == LessonProgressStatus.NOT_STARTED:
            lp.status = LessonProgressStatus.IN_PROGRESS

    enrollment.last_activity_at = now
    if enrollment.started_at is None:
        enrollment.started_at = now

    db.commit()
    db.refresh(lp)
    db.refresh(enrollment)
    return lp, enrollment, passed, score
