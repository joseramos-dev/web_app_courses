from typing import List, Optional

from sqlalchemy.orm import Session

from core.i18n import http_error

from modules.courses.model import CourseModel
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.lessons.model import LessonModel, LessonType
from modules.progress.model import LessonAttemptModel, LessonProgressModel
from modules.progress.performance_schema import (
    CoursePerformanceRowSchema,
    LessonAttemptListSchema,
    LessonAttemptSchema,
    RecentAttemptSchema,
    StudentPerformanceSchema,
)
from modules.progress.service import (
    _require_enrollment,
    _require_lesson,
)

_TEST_LESSON_TYPES = (LessonType.TEST, LessonType.MULTIPLE_SELECTION)
_ACTIVE_STATUSES = (EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.COMPLETED)


def _avg_best_scores(scores: List[float]) -> Optional[float]:
    if not scores:
        return None
    return round(sum(scores) / len(scores), 1)


def list_lesson_attempts(
    db: Session, user_id: int, lesson_id: int
) -> LessonAttemptListSchema:
    lesson = _require_lesson(db, lesson_id)
    if lesson.lesson_type not in _TEST_LESSON_TYPES:
        raise http_error(400, "attempt_history_test_only")

    enrollment = _require_enrollment(db, user_id, lesson.course_id)
    progress = (
        db.query(LessonProgressModel)
        .filter(
            LessonProgressModel.enrollment_id == enrollment.id,
            LessonProgressModel.lesson_id == lesson_id,
        )
        .first()
    )

    rows = (
        db.query(LessonAttemptModel)
        .filter(
            LessonAttemptModel.enrollment_id == enrollment.id,
            LessonAttemptModel.lesson_id == lesson_id,
        )
        .order_by(LessonAttemptModel.attempted_at.desc())
        .all()
    )

    return LessonAttemptListSchema(
        attempts=[LessonAttemptSchema.model_validate(row) for row in rows],
        best_score=float(progress.best_score) if progress and progress.best_score is not None else None,
        total_attempts=int(progress.attempts) if progress else len(rows),
    )


def _user_test_scores_for_course(
    db: Session, enrollment_id: int
) -> tuple[List[float], int, int]:
    rows = (
        db.query(LessonProgressModel.best_score, LessonProgressModel.attempts)
        .join(LessonModel, LessonModel.id == LessonProgressModel.lesson_id)
        .filter(
            LessonProgressModel.enrollment_id == enrollment_id,
            LessonModel.lesson_type.in_(_TEST_LESSON_TYPES),
            LessonProgressModel.attempts > 0,
            LessonProgressModel.best_score.isnot(None),
        )
        .all()
    )
    scores = [float(best) for best, _ in rows]
    total_attempts = sum(int(attempts) for _, attempts in rows)
    return scores, total_attempts, len(rows)


def _cohort_avg_for_course(db: Session, course_id: int) -> Optional[float]:
    rows = (
        db.query(LessonProgressModel.best_score)
        .join(EnrollmentModel, EnrollmentModel.id == LessonProgressModel.enrollment_id)
        .join(LessonModel, LessonModel.id == LessonProgressModel.lesson_id)
        .filter(
            EnrollmentModel.course_id == course_id,
            EnrollmentModel.status.in_(_ACTIVE_STATUSES),
            LessonModel.lesson_type.in_(_TEST_LESSON_TYPES),
            LessonProgressModel.attempts > 0,
            LessonProgressModel.best_score.isnot(None),
        )
        .all()
    )
    scores = [float(row[0]) for row in rows]
    return _avg_best_scores(scores)


def get_student_performance(
    db: Session, user_id: int
) -> StudentPerformanceSchema:
    enrollments = (
        db.query(EnrollmentModel, CourseModel.title)
        .join(CourseModel, CourseModel.id == EnrollmentModel.course_id)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.status.in_(_ACTIVE_STATUSES),
        )
        .order_by(EnrollmentModel.last_activity_at.desc().nullslast())
        .all()
    )

    course_rows: List[CoursePerformanceRowSchema] = []
    all_user_scores: List[float] = []
    total_attempts = 0

    for enrollment, course_title in enrollments:
        user_scores, attempts_count, tests_count = _user_test_scores_for_course(
            db, enrollment.id
        )
        total_attempts += attempts_count
        all_user_scores.extend(user_scores)

        if tests_count == 0 and attempts_count == 0:
            continue

        course_rows.append(
            CoursePerformanceRowSchema(
                course_id=enrollment.course_id,
                course_title=course_title,
                user_avg_score=_avg_best_scores(user_scores),
                cohort_avg_score=_cohort_avg_for_course(db, enrollment.course_id),
                total_attempts=attempts_count,
                tests_with_attempts=tests_count,
            )
        )

    recent_rows = (
        db.query(
            LessonAttemptModel,
            CourseModel.id,
            CourseModel.title,
            LessonModel.id,
            LessonModel.title,
        )
        .join(EnrollmentModel, EnrollmentModel.id == LessonAttemptModel.enrollment_id)
        .join(CourseModel, CourseModel.id == EnrollmentModel.course_id)
        .join(LessonModel, LessonModel.id == LessonAttemptModel.lesson_id)
        .filter(EnrollmentModel.user_id == user_id)
        .order_by(LessonAttemptModel.attempted_at.desc())
        .limit(10)
        .all()
    )

    recent_attempts = [
        RecentAttemptSchema(
            id=attempt.id,
            course_id=course_id,
            course_title=course_title,
            lesson_id=lesson_id,
            lesson_title=lesson_title,
            score=float(attempt.score),
            passed=bool(attempt.passed),
            attempted_at=attempt.attempted_at,
        )
        for attempt, course_id, course_title, lesson_id, lesson_title in recent_rows
    ]

    return StudentPerformanceSchema(
        overall_avg_score=_avg_best_scores(all_user_scores),
        total_attempts=total_attempts,
        courses=course_rows,
        recent_attempts=recent_attempts,
    )
