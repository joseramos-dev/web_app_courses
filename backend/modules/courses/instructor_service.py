from collections import defaultdict
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException

from modules.courses.instructor_schema import (
    InstructorCourseStudentsSchema,
    InstructorLessonProgressRowSchema,
    InstructorStudentDetailSchema,
    InstructorStudentRowSchema,
)
from modules.courses.model import CourseModel
from modules.dashboard.schema import (
    EnrollmentCohortSchema,
    LessonAggregateSchema,
    ProgressBucketSchema,
)
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.lessons.model import LessonModel, LessonType
from modules.progress.model import LessonProgressModel, LessonProgressStatus
from modules.users.model import UserModel, UserRole

_PROGRESS_BUCKET_LABELS = ("0–25%", "25–50%", "50–75%", "75–100%")
_TEST_LESSON_TYPES = (LessonType.TEST, LessonType.MULTIPLE_SELECTION)


def assert_can_manage_course(db: Session, course_id: int, user) -> CourseModel:
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.role == UserRole.ADMIN:
        return course
    if user.role == UserRole.INSTRUCTOR:
        if course.instructor_id is not None and user.id == course.instructor_id:
            return course
    raise HTTPException(
        status_code=403,
        detail="You don't have permission to manage this course",
    )


def _total_lessons(db: Session, course_id: int) -> int:
    return (
        db.query(func.count(LessonModel.id))
        .filter(LessonModel.course_id == course_id)
        .scalar()
        or 0
    )


def _student_row(
    enrollment: EnrollmentModel,
    student_name: str,
    total_lessons: int,
) -> InstructorStudentRowSchema:
    return InstructorStudentRowSchema(
        user_id=enrollment.user_id,
        student_name=student_name,
        status=enrollment.status,
        progress_percent=float(enrollment.progress_percent),
        completed_lessons_count=int(enrollment.completed_lessons_count),
        total_lessons=total_lessons,
        enrolled_at=enrollment.enrolled_at,
        last_activity_at=enrollment.last_activity_at,
        completed_at=enrollment.completed_at,
    )


def _cohort_month(enrolled_at) -> date:
    return date(enrolled_at.year, enrolled_at.month, 1)


def _build_progress_buckets(
    students: list[InstructorStudentRowSchema],
) -> list[ProgressBucketSchema]:
    counts = [0, 0, 0, 0]
    for student in students:
        progress = student.progress_percent
        if progress < 25:
            counts[0] += 1
        elif progress < 50:
            counts[1] += 1
        elif progress < 75:
            counts[2] += 1
        else:
            counts[3] += 1
    return [
        ProgressBucketSchema(label=label, count=count)
        for label, count in zip(_PROGRESS_BUCKET_LABELS, counts)
    ]


def _build_course_cohorts(
    enrollments: list[EnrollmentModel],
) -> list[EnrollmentCohortSchema]:
    grouped: dict[date, list[tuple[float, EnrollmentStatus]]] = defaultdict(list)
    for enrollment in enrollments:
        grouped[_cohort_month(enrollment.enrolled_at)].append(
            (float(enrollment.progress_percent), enrollment.status)
        )

    cohorts: list[EnrollmentCohortSchema] = []
    for cohort_month in sorted(grouped.keys()):
        entries = grouped[cohort_month]
        count = len(entries)
        avg_progress = sum(p for p, _ in entries) / count if count else 0.0
        completed = sum(1 for _, status in entries if status == EnrollmentStatus.COMPLETED)
        cohorts.append(
            EnrollmentCohortSchema(
                cohort_month=cohort_month,
                enrollments_count=count,
                avg_progress_percent=round(avg_progress, 1),
                completion_rate=round(completed / count, 3) if count else 0.0,
            )
        )
    return cohorts


def _lesson_stats(
    db: Session, course_id: int, students_count: int
) -> list[LessonAggregateSchema]:
    lessons = (
        db.query(LessonModel)
        .filter(LessonModel.course_id == course_id)
        .order_by(LessonModel.position.asc())
        .all()
    )
    if not lessons:
        return []

    agg_rows = (
        db.query(
            LessonProgressModel.lesson_id,
            func.count(LessonProgressModel.id),
            func.avg(LessonProgressModel.best_score),
        )
        .join(EnrollmentModel, EnrollmentModel.id == LessonProgressModel.enrollment_id)
        .filter(
            EnrollmentModel.course_id == course_id,
            LessonProgressModel.status == LessonProgressStatus.COMPLETED,
        )
        .group_by(LessonProgressModel.lesson_id)
        .all()
    )
    agg_by_lesson = {
        lesson_id: (int(completed_count), avg_score)
        for lesson_id, completed_count, avg_score in agg_rows
    }

    stats: list[LessonAggregateSchema] = []
    for lesson in lessons:
        completed_count, avg_score = agg_by_lesson.get(lesson.id, (0, None))
        completion_rate = (
            round(completed_count / students_count, 3) if students_count else 0.0
        )
        avg_best_score = None
        if lesson.lesson_type in _TEST_LESSON_TYPES and avg_score is not None:
            avg_best_score = round(float(avg_score), 1)
        stats.append(
            LessonAggregateSchema(
                lesson_id=lesson.id,
                lesson_title=lesson.title,
                position=lesson.position,
                completed_count=completed_count,
                completion_rate=completion_rate,
                avg_best_score=avg_best_score,
            )
        )
    return stats


def list_course_students(
    db: Session, course_id: int
) -> InstructorCourseStudentsSchema:
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    total_lessons = _total_lessons(db, course_id)

    rows = (
        db.query(EnrollmentModel, UserModel.name)
        .join(UserModel, UserModel.id == EnrollmentModel.user_id)
        .filter(EnrollmentModel.course_id == course_id)
        .order_by(EnrollmentModel.last_activity_at.desc().nullslast())
        .all()
    )

    students = [
        _student_row(enrollment, name, total_lessons)
        for enrollment, name in rows
    ]
    enrollments = [enrollment for enrollment, _ in rows]

    students_count = len(students)
    completed_count = sum(
        1 for s in students if s.status == EnrollmentStatus.COMPLETED
    )
    avg_progress = (
        sum(s.progress_percent for s in students) / students_count
        if students_count > 0
        else 0.0
    )
    completion_rate = (
        round(completed_count / students_count, 3) if students_count else 0.0
    )
    avg_rating = float(course.rating) if course.rating is not None else None

    return InstructorCourseStudentsSchema(
        course_id=course.id,
        course_title=course.title,
        total_lessons=total_lessons,
        students_count=students_count,
        completed_count=completed_count,
        avg_progress_percent=round(avg_progress, 1),
        completion_rate=completion_rate,
        avg_rating=avg_rating,
        lesson_stats=_lesson_stats(db, course_id, students_count),
        progress_buckets=_build_progress_buckets(students),
        cohorts=_build_course_cohorts(enrollments),
        students=students,
    )


def get_student_detail(
    db: Session, course_id: int, student_user_id: int
) -> InstructorStudentDetailSchema:
    total_lessons = _total_lessons(db, course_id)

    row = (
        db.query(EnrollmentModel, UserModel.name)
        .join(UserModel, UserModel.id == EnrollmentModel.user_id)
        .options(selectinload(EnrollmentModel.lesson_progress))
        .filter(
            EnrollmentModel.course_id == course_id,
            EnrollmentModel.user_id == student_user_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment, student_name = row
    progress_by_lesson = {lp.lesson_id: lp for lp in enrollment.lesson_progress}

    lessons = (
        db.query(LessonModel)
        .filter(LessonModel.course_id == course_id)
        .order_by(LessonModel.position.asc())
        .all()
    )

    lesson_rows: list[InstructorLessonProgressRowSchema] = []
    for lesson in lessons:
        lp: LessonProgressModel | None = progress_by_lesson.get(lesson.id)
        if lp is None:
            lesson_rows.append(
                InstructorLessonProgressRowSchema(
                    lesson_id=lesson.id,
                    lesson_title=lesson.title,
                    lesson_type=lesson.lesson_type,
                    position=lesson.position,
                    status=LessonProgressStatus.NOT_STARTED,
                )
            )
        else:
            lesson_rows.append(
                InstructorLessonProgressRowSchema(
                    lesson_id=lesson.id,
                    lesson_title=lesson.title,
                    lesson_type=lesson.lesson_type,
                    position=lesson.position,
                    status=lp.status,
                    best_score=lp.best_score,
                    attempts=int(lp.attempts),
                    completed_at=lp.completed_at,
                    last_activity_at=lp.last_activity_at,
                )
            )

    return InstructorStudentDetailSchema(
        student=_student_row(enrollment, student_name, total_lessons),
        lesson_progress=lesson_rows,
    )
