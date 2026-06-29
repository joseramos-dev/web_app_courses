from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modules.courses.instructor_service import assert_can_manage_course
from modules.enrollments.model import EnrollmentModel
from modules.lessons.model import LessonFileModel, LessonModel, LessonType
from modules.progress.model import (
    LessonProgressStatus,
    LessonSubmissionModel,
    SubmissionStatus,
)
from modules.progress.submission_schema import InstructorSubmissionRowSchema
from modules.progress.service import (
    _bump_study_activity,
    _get_or_create_lesson_progress,
    _now,
    _recalc_enrollment_progress,
    _require_enrollment,
    _require_lesson,
)
from modules.users.model import UserModel


def _require_assignment_lesson(db: Session, lesson_id: int) -> LessonModel:
    lesson = _require_lesson(db, lesson_id)
    if lesson.lesson_type != LessonType.ASSIGNMENT:
        raise HTTPException(
            status_code=400,
            detail="This lesson is not an assignment",
        )
    return lesson


def _complete_assignment_on_pass(
    db: Session,
    user_id: int,
    enrollment: EnrollmentModel,
    lesson_id: int,
    score: float,
) -> None:
    """Mark lesson progress completed when a passing grade is recorded."""
    lp = _get_or_create_lesson_progress(db, enrollment.id, lesson_id)
    now = _now()
    was_already_completed = lp.status == LessonProgressStatus.COMPLETED

    lp.status = LessonProgressStatus.COMPLETED
    if lp.completed_at is None:
        lp.completed_at = now
    lp.last_activity_at = now
    if lp.started_at is None:
        lp.started_at = now
    lp.best_score = max(lp.best_score or 0.0, score)

    _recalc_enrollment_progress(db, enrollment)
    if not was_already_completed:
        _bump_study_activity(db, user_id, completed=True)

    enrollment.last_activity_at = now
    if enrollment.started_at is None:
        enrollment.started_at = now


def _validate_submission_file(
    db: Session,
    user_id: int,
    lesson_id: int,
    file_id: int,
) -> None:
    file_record = (
        db.query(LessonFileModel)
        .filter(
            LessonFileModel.id == file_id,
            LessonFileModel.lesson_id == lesson_id,
            LessonFileModel.uploaded_by == user_id,
        )
        .first()
    )
    if file_record is None:
        raise HTTPException(status_code=400, detail="Invalid file for this submission")


def submit_assignment(
    db: Session,
    user_id: int,
    lesson_id: int,
    body: Optional[str],
    file_id: Optional[int] = None,
) -> LessonSubmissionModel:
    lesson = _require_assignment_lesson(db, lesson_id)
    enrollment = _require_enrollment(db, user_id, lesson.course_id)

    if not body and not file_id:
        raise HTTPException(
            status_code=400,
            detail="Submission must include text or a file",
        )
    if file_id and lesson.allows_file_submission is False:
        raise HTTPException(
            status_code=400,
            detail="File submissions are not allowed for this assignment",
        )
    if file_id:
        _validate_submission_file(db, user_id, lesson_id, file_id)

    submission = (
        db.query(LessonSubmissionModel)
        .filter(
            LessonSubmissionModel.enrollment_id == enrollment.id,
            LessonSubmissionModel.lesson_id == lesson_id,
        )
        .first()
    )

    now = _now()
    if submission is None:
        submission = LessonSubmissionModel(
            enrollment_id=enrollment.id,
            lesson_id=lesson_id,
            body=body,
            file_id=file_id,
            status=SubmissionStatus.PENDING,
            submitted_at=now,
        )
        db.add(submission)
    else:
        if submission.status == SubmissionStatus.GRADED:
            raise HTTPException(
                status_code=400,
                detail="This assignment has already been graded",
            )
        submission.body = body
        submission.file_id = file_id
        submission.status = SubmissionStatus.PENDING
        submission.score = None
        submission.feedback = None
        submission.graded_at = None
        submission.graded_by = None
        submission.submitted_at = now

    lp = _get_or_create_lesson_progress(db, enrollment.id, lesson_id)
    if lp.status == LessonProgressStatus.NOT_STARTED:
        lp.status = LessonProgressStatus.IN_PROGRESS
        lp.started_at = now
        _bump_study_activity(db, user_id, started=True)
    lp.last_activity_at = now
    enrollment.last_activity_at = now
    if enrollment.started_at is None:
        enrollment.started_at = now

    db.commit()
    db.refresh(submission)
    return submission


def get_submission(
    db: Session, user_id: int, lesson_id: int
) -> LessonSubmissionModel:
    lesson = _require_assignment_lesson(db, lesson_id)
    enrollment = _require_enrollment(db, user_id, lesson.course_id)

    submission = (
        db.query(LessonSubmissionModel)
        .filter(
            LessonSubmissionModel.enrollment_id == enrollment.id,
            LessonSubmissionModel.lesson_id == lesson_id,
        )
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="No submission for this lesson")
    return submission


def list_course_submissions(
    db: Session,
    course_id: int,
    instructor,
    status: Optional[SubmissionStatus] = None,
) -> List[InstructorSubmissionRowSchema]:
    assert_can_manage_course(db, course_id, instructor)

    query = (
        db.query(LessonSubmissionModel, LessonModel, UserModel)
        .join(LessonModel, LessonModel.id == LessonSubmissionModel.lesson_id)
        .join(EnrollmentModel, EnrollmentModel.id == LessonSubmissionModel.enrollment_id)
        .join(UserModel, UserModel.id == EnrollmentModel.user_id)
        .filter(LessonModel.course_id == course_id)
        .order_by(LessonSubmissionModel.submitted_at.desc())
    )
    if status is not None:
        query = query.filter(LessonSubmissionModel.status == status)

    rows = query.all()
    return [
        InstructorSubmissionRowSchema(
            id=submission.id,
            lesson_id=lesson.id,
            lesson_title=lesson.title,
            student_user_id=user.id,
            student_name=user.name,
            body=submission.body,
            file_id=submission.file_id,
            status=submission.status,
            score=submission.score,
            feedback=submission.feedback,
            submitted_at=submission.submitted_at,
            graded_at=submission.graded_at,
        )
        for submission, lesson, user in rows
    ]


def grade_submission(
    db: Session,
    instructor_id: int,
    course_id: int,
    instructor,
    submission_id: int,
    score: float,
    feedback: Optional[str],
    returned: bool,
) -> tuple[LessonSubmissionModel, bool]:
    assert_can_manage_course(db, course_id, instructor)

    row = (
        db.query(LessonSubmissionModel, LessonModel, EnrollmentModel)
        .join(LessonModel, LessonModel.id == LessonSubmissionModel.lesson_id)
        .join(EnrollmentModel, EnrollmentModel.id == LessonSubmissionModel.enrollment_id)
        .filter(
            LessonSubmissionModel.id == submission_id,
            LessonModel.course_id == course_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission, lesson, enrollment = row
    if lesson.lesson_type != LessonType.ASSIGNMENT:
        raise HTTPException(status_code=400, detail="Lesson is not an assignment")

    max_score = lesson.max_score if lesson.max_score is not None else 100.0
    if score > max_score:
        raise HTTPException(
            status_code=400,
            detail=f"Score cannot exceed max_score ({max_score})",
        )

    now = _now()
    submission.score = score
    submission.feedback = feedback
    submission.graded_at = now
    submission.graded_by = instructor_id

    passing_score = lesson.passing_score if lesson.passing_score is not None else 70.0
    lesson_completed = False

    if returned:
        submission.status = SubmissionStatus.RETURNED
    else:
        submission.status = SubmissionStatus.GRADED
        if score >= passing_score:
            _complete_assignment_on_pass(
                db,
                enrollment.user_id,
                enrollment,
                lesson.id,
                score,
            )
            lesson_completed = True

    db.commit()
    db.refresh(submission)
    return submission, lesson_completed
