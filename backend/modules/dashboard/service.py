"""Service layer for the dashboard endpoints.

Each public function returns a fully-formed response model so the routes
stay thin. The queries here do **not** loop over results and do extra
queries per row (no N+1) -- everything is precomputed in aggregate
queries and stitched together in Python.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Literal, Optional, Tuple

from sqlalchemy import case, distinct, func
from sqlalchemy.orm import Session

from modules.courses.model import CourseModel
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.lessons.model import LessonModel
from modules.progress.model import (
    LessonProgressModel,
    LessonProgressStatus,
    StudyActivityModel,
)
from modules.users.model import UserModel, UserRole
from modules.dashboard.schema import (
    AdminDashboardSchema,
    CategoryStatSchema,
    CompletedCourseRowSchema,
    DailyActivitySchema,
    DifficultyStatSchema,
    EnrollmentCohortSchema,
    InstructorCourseRowSchema,
    InstructorDashboardSchema,
    LessonTypeStatSchema,
    PublicStatsSchema,
    RecentCourseSchema,
    RecentLessonSchema,
    SiteStatSchema,
    StudentDashboardSchema,
    TopCourseSchema,
    TopLessonSchema,
    TopStudentSchema,
)


# ---------- Shared helpers ----------

def _fill_daily_series(
    rows: List[Tuple[date, int, int]],
    days: int,
    end: Optional[date] = None,
) -> List[DailyActivitySchema]:
    """Turn sparse `(date, started, completed)` rows into a contiguous
    `days`-long series ending at `end` (today by default), filling in
    zeros for days without rows. The frontend chart relies on the series
    being dense and sorted ascending."""
    if end is None:
        end = date.today()
    by_date: Dict[date, Tuple[int, int]] = {
        d: (started, completed) for d, started, completed in rows
    }
    series: List[DailyActivitySchema] = []
    for offset in range(days - 1, -1, -1):
        day = end - timedelta(days=offset)
        started, completed = by_date.get(day, (0, 0))
        series.append(
            DailyActivitySchema(
                date=day,
                lessons_started=started,
                lessons_completed=completed,
            )
        )
    return series


def _compute_streak(rows_desc: List[Tuple[date, int]]) -> int:
    """Given `(date, lessons_completed)` rows sorted DESC by date, return
    the length of the streak of consecutive days with `lessons_completed > 0`
    ending today (or yesterday if today has no activity yet).
    """
    today = date.today()
    yesterday = today - timedelta(days=1)

    valid = [(d, c) for d, c in rows_desc if c > 0]
    if not valid:
        return 0

    most_recent_day = valid[0][0]
    if most_recent_day not in (today, yesterday):
        return 0

    expected = most_recent_day
    streak = 0
    for d, _ in valid:
        if d == expected:
            streak += 1
            expected = expected - timedelta(days=1)
        else:
            break
    return streak


def _period_config(period: Literal["day", "week", "month"]) -> Tuple[int, date, datetime]:
    """Return (series_days, since_date, since_datetime) for a public-stats period."""
    today = date.today()
    if period == "day":
        days = 1
    elif period == "week":
        days = 7
    else:
        days = 30
    since_date = today - timedelta(days=days - 1)
    since_datetime = datetime.combine(since_date, datetime.min.time(), tzinfo=timezone.utc)
    return days, since_date, since_datetime


def _get_top_courses(db: Session, limit: int = 5) -> List[TopCourseSchema]:
    rows = (
        db.query(
            CourseModel.id,
            CourseModel.title,
            func.count(EnrollmentModel.id).label("enrollments_count"),
        )
        .outerjoin(EnrollmentModel, EnrollmentModel.course_id == CourseModel.id)
        .group_by(CourseModel.id, CourseModel.title)
        .order_by(func.count(EnrollmentModel.id).desc())
        .limit(limit)
        .all()
    )
    return [
        TopCourseSchema(course_id=cid, course_title=title, enrollments_count=int(cnt))
        for cid, title, cnt in rows
        if int(cnt) > 0
    ]


def _get_category_distribution(db: Session) -> List[CategoryStatSchema]:
    rows = (
        db.query(
            CourseModel.category,
            func.count(EnrollmentModel.id),
        )
        .join(EnrollmentModel, EnrollmentModel.course_id == CourseModel.id)
        .group_by(CourseModel.category)
        .order_by(func.count(EnrollmentModel.id).desc())
        .all()
    )
    return [
        CategoryStatSchema(category=cat, enrollments_count=int(cnt))
        for cat, cnt in rows
    ]


def _get_global_activity_series(
    db: Session, since_date: date, days: int
) -> List[DailyActivitySchema]:
    activity_rows = (
        db.query(
            StudyActivityModel.activity_date,
            func.coalesce(func.sum(StudyActivityModel.lessons_started), 0),
            func.coalesce(func.sum(StudyActivityModel.lessons_completed), 0),
        )
        .filter(StudyActivityModel.activity_date >= since_date)
        .group_by(StudyActivityModel.activity_date)
        .all()
    )
    return _fill_daily_series(
        [(d, int(s), int(c)) for d, s, c in activity_rows], days=days
    )


def _get_lessons_completed_in_period(db: Session, since_date: date) -> int:
    total = (
        db.query(func.coalesce(func.sum(StudyActivityModel.lessons_completed), 0))
        .filter(StudyActivityModel.activity_date >= since_date)
        .scalar()
    )
    return int(total or 0)


def _get_lesson_completions_by_type(
    db: Session, since_datetime: datetime
) -> List[LessonTypeStatSchema]:
    rows = (
        db.query(
            LessonModel.lesson_type,
            func.count(LessonProgressModel.id),
        )
        .join(LessonModel, LessonModel.id == LessonProgressModel.lesson_id)
        .filter(
            LessonProgressModel.status == LessonProgressStatus.COMPLETED,
            LessonProgressModel.completed_at.isnot(None),
            LessonProgressModel.completed_at >= since_datetime,
        )
        .group_by(LessonModel.lesson_type)
        .order_by(func.count(LessonProgressModel.id).desc())
        .all()
    )
    return [
        LessonTypeStatSchema(lesson_type=lesson_type, completed_count=int(cnt))
        for lesson_type, cnt in rows
    ]


def _cohort_month(dt: datetime) -> date:
    return date(dt.year, dt.month, 1)


def _build_enrollment_cohorts(
    rows: List[Tuple[datetime, float, EnrollmentStatus]],
) -> List[EnrollmentCohortSchema]:
    grouped: Dict[date, List[Tuple[float, EnrollmentStatus]]] = defaultdict(list)
    for enrolled_at, progress_percent, status in rows:
        grouped[_cohort_month(enrolled_at)].append((progress_percent, status))

    cohorts: List[EnrollmentCohortSchema] = []
    for cohort_month in sorted(grouped.keys()):
        entries = grouped[cohort_month]
        count = len(entries)
        avg_progress = sum(p for p, _ in entries) / count if count else 0.0
        completed = sum(1 for _, s in entries if s == EnrollmentStatus.COMPLETED)
        cohorts.append(
            EnrollmentCohortSchema(
                cohort_month=cohort_month,
                enrollments_count=count,
                avg_progress_percent=round(avg_progress, 1),
                completion_rate=round(completed / count, 3) if count else 0.0,
            )
        )
    return cohorts


# ---------- Student ----------

def get_student_summary(db: Session, user_id: int) -> StudentDashboardSchema:
    # Counts of enrollments by status, lessons-completed total.
    status_rows = (
        db.query(EnrollmentModel.status, func.count(EnrollmentModel.id))
        .filter(EnrollmentModel.user_id == user_id)
        .group_by(EnrollmentModel.status)
        .all()
    )
    by_status = {status: cnt for status, cnt in status_rows}
    in_progress_count = by_status.get(EnrollmentStatus.IN_PROGRESS, 0)
    completed_count = by_status.get(EnrollmentStatus.COMPLETED, 0)

    total_lessons_completed = (
        db.query(func.coalesce(func.sum(EnrollmentModel.completed_lessons_count), 0))
        .filter(EnrollmentModel.user_id == user_id)
        .scalar()
        or 0
    )

    # Streak + last-7-days chart from study_activity.
    activity_rows = (
        db.query(
            StudyActivityModel.activity_date,
            StudyActivityModel.lessons_started,
            StudyActivityModel.lessons_completed,
        )
        .filter(StudyActivityModel.user_id == user_id)
        .order_by(StudyActivityModel.activity_date.desc())
        .all()
    )
    streak_days = _compute_streak([(d, c) for d, _, c in activity_rows])
    last_7_days = _fill_daily_series(
        [(d, s, c) for d, s, c in activity_rows], days=7
    )

    # Recent courses: top 5 in_progress enrollments by last_activity_at,
    # joined with course title and total lessons (column_property).
    enrollments = (
        db.query(EnrollmentModel, CourseModel.title, CourseModel.lessons_count)
        .join(CourseModel, EnrollmentModel.course_id == CourseModel.id)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.status == EnrollmentStatus.IN_PROGRESS,
        )
        .order_by(EnrollmentModel.last_activity_at.desc().nullslast())
        .limit(5)
        .all()
    )

    # Resolve next_lesson_id for each in-progress course in a single query.
    course_ids = [e.course_id for e, _, _ in enrollments]
    next_lesson_by_course: Dict[int, int] = {}
    if course_ids:
        # All lessons of those courses, ordered by position.
        lessons = (
            db.query(LessonModel.id, LessonModel.course_id, LessonModel.position)
            .filter(LessonModel.course_id.in_(course_ids))
            .order_by(LessonModel.course_id, LessonModel.position)
            .all()
        )
        # Set of completed lesson ids for the user across those courses.
        completed_ids = {
            lid
            for (lid,) in db.query(LessonProgressModel.lesson_id)
            .join(EnrollmentModel, EnrollmentModel.id == LessonProgressModel.enrollment_id)
            .filter(
                EnrollmentModel.user_id == user_id,
                EnrollmentModel.course_id.in_(course_ids),
                LessonProgressModel.status == LessonProgressStatus.COMPLETED,
            )
            .all()
        }
        # First not-completed lesson per course wins.
        for lid, cid, _pos in lessons:
            if cid in next_lesson_by_course:
                continue
            if lid not in completed_ids:
                next_lesson_by_course[cid] = lid

    recent_courses = [
        RecentCourseSchema(
            course_id=enr.course_id,
            course_title=title,
            progress_percent=enr.progress_percent,
            completed_lessons_count=enr.completed_lessons_count,
            total_lessons=lessons_count or 0,
            last_activity_at=enr.last_activity_at,
            next_lesson_id=next_lesson_by_course.get(enr.course_id),
        )
        for enr, title, lessons_count in enrollments
    ]

    completed_rows = (
        db.query(EnrollmentModel, CourseModel.title)
        .join(CourseModel, EnrollmentModel.course_id == CourseModel.id)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.status == EnrollmentStatus.COMPLETED,
        )
        .order_by(EnrollmentModel.completed_at.desc().nullslast())
        .limit(10)
        .all()
    )
    completed_courses = [
        CompletedCourseRowSchema(
            course_id=enr.course_id,
            course_title=title,
            completed_at=enr.completed_at,
        )
        for enr, title in completed_rows
    ]

    # Recent lesson activity: last 5 lesson_progress events with names.
    recent_lp = (
        db.query(
            LessonProgressModel,
            LessonModel.title,
            LessonModel.course_id,
            CourseModel.title,
        )
        .join(EnrollmentModel, EnrollmentModel.id == LessonProgressModel.enrollment_id)
        .join(LessonModel, LessonModel.id == LessonProgressModel.lesson_id)
        .join(CourseModel, CourseModel.id == LessonModel.course_id)
        .filter(EnrollmentModel.user_id == user_id)
        .order_by(LessonProgressModel.last_activity_at.desc().nullslast())
        .limit(5)
        .all()
    )
    recent_lessons = [
        RecentLessonSchema(
            lesson_id=lp.lesson_id,
            lesson_title=lesson_title,
            course_id=course_id,
            course_title=course_title,
            status=lp.status,
            last_activity_at=lp.last_activity_at,
            completed_at=lp.completed_at,
        )
        for lp, lesson_title, course_id, course_title in recent_lp
    ]

    return StudentDashboardSchema(
        in_progress_count=in_progress_count,
        completed_count=completed_count,
        total_lessons_completed=total_lessons_completed,
        streak_days=streak_days,
        last_7_days=last_7_days,
        recent_courses=recent_courses,
        completed_courses=completed_courses,
        recent_lessons=recent_lessons,
    )


# ---------- Instructor ----------

def get_instructor_summary(
    db: Session, instructor_id: int
) -> InstructorDashboardSchema:
    instructor_courses = (
        db.query(CourseModel.id, CourseModel.title, CourseModel.rating)
        .filter(CourseModel.instructor_id == instructor_id)
        .all()
    )
    course_ids = [row[0] for row in instructor_courses]
    courses_count = len(instructor_courses)

    if not course_ids:
        return InstructorDashboardSchema(
            courses_count=0,
            total_students=0,
            avg_progress_percent=0.0,
            completed_students=0,
            courses=[],
            top_active_students=[],
            top_completed_lessons=[],
        )

    # One row per (course_id) with all its aggregates.
    course_rows = (
        db.query(
            EnrollmentModel.course_id,
            func.count(distinct(EnrollmentModel.user_id)).label("students_count"),
            func.coalesce(func.avg(EnrollmentModel.progress_percent), 0.0).label("avg_progress"),
            func.sum(
                case(
                    (EnrollmentModel.status == EnrollmentStatus.COMPLETED, 1),
                    else_=0,
                )
            ).label("completed_students"),
            func.max(EnrollmentModel.last_activity_at).label("last_activity_at"),
        )
        .filter(EnrollmentModel.course_id.in_(course_ids))
        .group_by(EnrollmentModel.course_id)
        .all()
    )
    course_aggs = {row.course_id: row for row in course_rows}

    courses_payload: List[InstructorCourseRowSchema] = []
    for cid, title, _rating in instructor_courses:
        agg = course_aggs.get(cid)
        students_count = int(agg.students_count) if agg else 0
        completed_students = int(agg.completed_students or 0) if agg else 0
        completion_rate = (
            round(completed_students / students_count, 3) if students_count else 0.0
        )
        courses_payload.append(
            InstructorCourseRowSchema(
                course_id=cid,
                course_title=title,
                students_count=students_count,
                avg_progress_percent=float(agg.avg_progress) if agg else 0.0,
                completed_students=completed_students,
                completion_rate=completion_rate,
                avg_rating=float(_rating) if _rating is not None else None,
                last_activity_at=agg.last_activity_at if agg else None,
            )
        )

    # Global instructor stats.
    total_students = (
        db.query(func.count(distinct(EnrollmentModel.user_id)))
        .filter(EnrollmentModel.course_id.in_(course_ids))
        .scalar()
        or 0
    )
    avg_progress_percent = (
        db.query(func.coalesce(func.avg(EnrollmentModel.progress_percent), 0.0))
        .filter(EnrollmentModel.course_id.in_(course_ids))
        .scalar()
        or 0.0
    )
    completed_students = (
        db.query(func.count(EnrollmentModel.id))
        .filter(
            EnrollmentModel.course_id.in_(course_ids),
            EnrollmentModel.status == EnrollmentStatus.COMPLETED,
        )
        .scalar()
        or 0
    )

    # Top active students in instructor's courses, last 7 days.
    since = date.today() - timedelta(days=6)
    top_students_rows = (
        db.query(
            UserModel.id,
            UserModel.name,
            func.coalesce(func.sum(StudyActivityModel.lessons_completed), 0).label(
                "lessons_done"
            ),
        )
        .join(EnrollmentModel, EnrollmentModel.user_id == UserModel.id)
        .join(
            StudyActivityModel,
            (StudyActivityModel.user_id == UserModel.id)
            & (StudyActivityModel.activity_date >= since),
        )
        .filter(EnrollmentModel.course_id.in_(course_ids))
        .group_by(UserModel.id, UserModel.name)
        .order_by(func.sum(StudyActivityModel.lessons_completed).desc())
        .limit(5)
        .all()
    )
    top_active_students = [
        TopStudentSchema(
            user_id=uid, name=name, lessons_completed_in_window=int(done)
        )
        for uid, name, done in top_students_rows
        if int(done) > 0
    ]

    # Top completed lessons in instructor's courses.
    top_lessons_rows = (
        db.query(
            LessonModel.id,
            LessonModel.title,
            CourseModel.id,
            CourseModel.title,
            func.count(LessonProgressModel.id).label("completed_count"),
        )
        .join(LessonProgressModel, LessonProgressModel.lesson_id == LessonModel.id)
        .join(CourseModel, CourseModel.id == LessonModel.course_id)
        .filter(
            LessonModel.course_id.in_(course_ids),
            LessonProgressModel.status == LessonProgressStatus.COMPLETED,
        )
        .group_by(LessonModel.id, LessonModel.title, CourseModel.id, CourseModel.title)
        .order_by(func.count(LessonProgressModel.id).desc())
        .limit(5)
        .all()
    )
    top_completed_lessons = [
        TopLessonSchema(
            lesson_id=lid,
            lesson_title=ltitle,
            course_id=cid,
            course_title=ctitle,
            completed_count=int(cnt),
        )
        for lid, ltitle, cid, ctitle, cnt in top_lessons_rows
    ]

    return InstructorDashboardSchema(
        courses_count=courses_count,
        total_students=int(total_students),
        avg_progress_percent=float(avg_progress_percent),
        completed_students=int(completed_students),
        courses=courses_payload,
        top_active_students=top_active_students,
        top_completed_lessons=top_completed_lessons,
    )


# ---------- Admin ----------

def get_admin_summary(db: Session) -> AdminDashboardSchema:
    students_count = (
        db.query(func.count(UserModel.id))
        .filter(UserModel.role == UserRole.STUDENT)
        .scalar()
        or 0
    )
    courses_count = db.query(func.count(CourseModel.id)).scalar() or 0
    active_enrollments_count = (
        db.query(func.count(EnrollmentModel.id))
        .filter(EnrollmentModel.status == EnrollmentStatus.IN_PROGRESS)
        .scalar()
        or 0
    )
    total_lessons_completed = (
        db.query(func.coalesce(func.sum(EnrollmentModel.completed_lessons_count), 0)).scalar()
        or 0
    )

    total_enrollments = (
        db.query(func.count(EnrollmentModel.id)).scalar() or 0
    )
    completed_enrollments = (
        db.query(func.count(EnrollmentModel.id))
        .filter(EnrollmentModel.status == EnrollmentStatus.COMPLETED)
        .scalar()
        or 0
    )
    completion_rate = (
        round(completed_enrollments / total_enrollments, 3)
        if total_enrollments
        else 0.0
    )

    avg_course_rating_raw = (
        db.query(func.avg(CourseModel.rating))
        .filter(CourseModel.rating.isnot(None))
        .scalar()
    )
    avg_course_rating = (
        round(float(avg_course_rating_raw), 2)
        if avg_course_rating_raw is not None
        else None
    )

    # Top 5 courses by enrollments (any status).
    top_courses = _get_top_courses(db, limit=5)

    # Top active students globally, last 30 days.
    since = date.today() - timedelta(days=29)
    top_students_rows = (
        db.query(
            UserModel.id,
            UserModel.name,
            func.coalesce(func.sum(StudyActivityModel.lessons_completed), 0).label(
                "lessons_done"
            ),
        )
        .join(StudyActivityModel, StudyActivityModel.user_id == UserModel.id)
        .filter(
            UserModel.role == UserRole.STUDENT,
            StudyActivityModel.activity_date >= since,
        )
        .group_by(UserModel.id, UserModel.name)
        .order_by(func.sum(StudyActivityModel.lessons_completed).desc())
        .limit(5)
        .all()
    )
    top_active_students = [
        TopStudentSchema(
            user_id=uid, name=name, lessons_completed_in_window=int(done)
        )
        for uid, name, done in top_students_rows
        if int(done) > 0
    ]

    # Enrollments per category (joined via course).
    category_distribution = _get_category_distribution(db)

    site_rows = (
        db.query(
            CourseModel.site,
            func.count(EnrollmentModel.id),
        )
        .join(EnrollmentModel, EnrollmentModel.course_id == CourseModel.id)
        .group_by(CourseModel.site)
        .order_by(func.count(EnrollmentModel.id).desc())
        .all()
    )
    site_distribution = [
        SiteStatSchema(site=site, enrollments_count=int(cnt))
        for site, cnt in site_rows
    ]

    difficulty_rows = (
        db.query(
            CourseModel.difficulty,
            func.count(EnrollmentModel.id),
        )
        .join(EnrollmentModel, EnrollmentModel.course_id == CourseModel.id)
        .group_by(CourseModel.difficulty)
        .order_by(func.count(EnrollmentModel.id).desc())
        .all()
    )
    difficulty_distribution = [
        DifficultyStatSchema(difficulty=diff, enrollments_count=int(cnt))
        for diff, cnt in difficulty_rows
    ]

    cohort_since = date.today().replace(day=1) - timedelta(days=365)
    cohort_rows = (
        db.query(
            EnrollmentModel.enrolled_at,
            EnrollmentModel.progress_percent,
            EnrollmentModel.status,
        )
        .filter(EnrollmentModel.enrolled_at >= cohort_since)
        .all()
    )
    enrollment_cohorts = _build_enrollment_cohorts(
        [(enrolled_at, float(progress_percent), status) for enrolled_at, progress_percent, status in cohort_rows]
    )

    # Global daily activity for last 30 days.
    last_30_days = _get_global_activity_series(db, since, days=30)

    return AdminDashboardSchema(
        students_count=int(students_count),
        courses_count=int(courses_count),
        active_enrollments_count=int(active_enrollments_count),
        total_lessons_completed=int(total_lessons_completed),
        total_enrollments=int(total_enrollments),
        completion_rate=completion_rate,
        avg_course_rating=avg_course_rating,
        top_courses=top_courses,
        top_active_students=top_active_students,
        category_distribution=category_distribution,
        site_distribution=site_distribution,
        difficulty_distribution=difficulty_distribution,
        enrollment_cohorts=enrollment_cohorts,
        last_30_days=last_30_days,
    )


# ---------- Public landing ----------


def get_public_stats(
    db: Session, period: Literal["day", "week", "month"]
) -> PublicStatsSchema:
    days, since_date, since_datetime = _period_config(period)

    courses_count = db.query(func.count(CourseModel.id)).scalar() or 0
    active_enrollments_count = (
        db.query(func.count(EnrollmentModel.id))
        .filter(EnrollmentModel.status == EnrollmentStatus.IN_PROGRESS)
        .scalar()
        or 0
    )
    total_enrollments = db.query(func.count(EnrollmentModel.id)).scalar() or 0

    return PublicStatsSchema(
        period=period,
        courses_count=int(courses_count),
        total_enrollments=int(total_enrollments),
        active_enrollments_count=int(active_enrollments_count),
        lessons_completed_in_period=_get_lessons_completed_in_period(db, since_date),
        top_courses=_get_top_courses(db, limit=5),
        category_distribution=_get_category_distribution(db),
        activity_series=_get_global_activity_series(db, since_date, days),
        lesson_completions_by_type=_get_lesson_completions_by_type(
            db, since_datetime
        ),
    )
