"""Simulated student activity for the demo accounts.

The catalogue has 300 courses and nearly ten thousand lessons, but until this
runs the database holds almost no enrollments: nothing for the recommender to
learn from, nothing on the dashboards, and no data-size axis for the load-test
charts. This module makes the demo students actually study, each with their own
taste and ability, spread over the last couple of months.

It is not a test: it asserts nothing and cannot fail. It builds the fixture that
the tests and the load runs need.

Only accounts carrying `DEMO_STUDENT_PREFIX` are touched, which is what makes it
reversible: the admin panel's "remove demo accounts" button cascades everything
written here away.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from modules.course_ratings.model import CourseRatingModel
from modules.course_ratings.stats import refresh_course_rating_stats
from modules.courses.duration_utils import duration_bucket
from modules.courses.model import Category, CourseModel, DurationBucket
from modules.dev.seeding import DEMO_STUDENT_PREFIX
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.lessons.model import LessonModel, LessonType, QuestionModel
from modules.progress.model import (
    LessonAttemptModel,
    LessonProgressModel,
    LessonProgressStatus,
    StudyActivityModel,
)
from modules.progress.service import PASSING_SCORE, _recalc_enrollment_progress
from modules.recommendations.model import RecommendationModel
from modules.topics.model import TopicModel
from modules.users.model import UserModel
from modules.users.role_service import purge_student_data

RANDOM_SEED = 42

MIN_COURSES, MAX_COURSES = 2, 6

# Competence is the chance of getting a single question right. A quiz has two
# questions and needs both to clear PASSING_SCORE, so the pass rate per attempt
# is the square of this: 0.55 barely scrapes through, 0.95 almost never fails.
MIN_COMPETENCE, MAX_COMPETENCE = 0.55, 0.95
MAX_QUIZ_ATTEMPTS = 5

# Four fifths of the courses come from the student's taste and one fifth at
# random. The noise is deliberate: perfectly separable groups would leave the
# collaborative recommender with nothing to discover.
ON_PROFILE_SHARE = 0.8

MIN_WINDOW_DAYS, MAX_WINDOW_DAYS = 20, 60
STUDY_DAY_SHARE = 0.6  # the rest of the window is time off
REST_DAY_CHANCE = 0.35

RATED_SHARE = 0.6  # of the courses a student completes

DURATION_CHOICES = tuple(DurationBucket)

REAL_CATEGORIES = [c for c in Category if c != Category.NON_DEFINED]


@dataclass
class _Profile:
    categories: list[Category]
    duration: DurationBucket
    competence: float
    start_day: date


@dataclass
class _CourseCard:
    id: int
    category: Category
    bucket: DurationBucket | None


@dataclass
class _LessonCard:
    id: int
    lesson_type: LessonType
    duration_seconds: int | None
    question_count: int


@dataclass
class _DayTally:
    started: int = 0
    completed: int = 0
    seconds: int = 0


@dataclass
class _Totals:
    students: int = 0
    enrollments: int = 0
    completed_courses: int = 0
    abandoned_courses: int = 0
    lessons: int = 0
    attempts: int = 0
    failed_attempts: int = 0
    ratings: int = 0
    skipped: int = 0

    def as_dict(self) -> dict[str, int]:
        return self.__dict__.copy()


# ---------------------------------------------------------------- loading

def _demo_students(db: Session) -> list[UserModel]:
    return (
        db.query(UserModel)
        .filter(UserModel.name.like(f"{DEMO_STUDENT_PREFIX}%"))
        .order_by(UserModel.id)
        .all()
    )


def _catalogue(db: Session) -> list[_CourseCard]:
    rows = (
        db.query(CourseModel.id, CourseModel.category, CourseModel.duration_seconds)
        .filter(CourseModel.is_public.is_(True))
        .order_by(CourseModel.id)
        .all()
    )
    return [
        _CourseCard(id=cid, category=category, bucket=duration_bucket(seconds))
        for cid, category, seconds in rows
    ]


def _course_lessons(db: Session, course_id: int) -> list[_LessonCard]:
    """Lessons in the order a student meets them, with their question count.

    Counting the questions here keeps the walk free of per-lesson queries: a
    quiz only needs to know how many questions it has to produce a score.
    """
    rows = (
        db.query(
            LessonModel.id,
            LessonModel.lesson_type,
            LessonModel.duration_seconds,
            func.count(QuestionModel.id),
        )
        .join(TopicModel, LessonModel.topic_id == TopicModel.id)
        .outerjoin(QuestionModel, QuestionModel.lesson_id == LessonModel.id)
        .filter(LessonModel.course_id == course_id)
        .group_by(LessonModel.id, TopicModel.position, LessonModel.position)
        .order_by(TopicModel.position.asc(), LessonModel.position.asc())
        .all()
    )
    return [
        _LessonCard(
            id=lid,
            lesson_type=lesson_type,
            duration_seconds=seconds,
            question_count=questions,
        )
        for lid, lesson_type, seconds, questions in rows
    ]


# ---------------------------------------------------------------- profile

def _build_profile(rng: random.Random, today: date) -> _Profile:
    return _Profile(
        categories=rng.sample(REAL_CATEGORIES, rng.randint(1, 2)),
        duration=rng.choice(DURATION_CHOICES),
        competence=rng.uniform(MIN_COMPETENCE, MAX_COMPETENCE),
        start_day=today - timedelta(days=rng.randint(MIN_WINDOW_DAYS, MAX_WINDOW_DAYS)),
    )


def _pick_courses(
    rng: random.Random, profile: _Profile, catalogue: list[_CourseCard]
) -> list[_CourseCard]:
    wanted = rng.randint(MIN_COURSES, MAX_COURSES)
    on_profile = [
        course
        for course in catalogue
        if course.category in profile.categories and course.bucket == profile.duration
    ]

    picked: list[_CourseCard] = []
    seen: set[int] = set()
    # Bounded rather than "until full": drawing with replacement from a pool
    # smaller than `wanted` would otherwise spin forever.
    for _ in range(wanted * 20):
        if len(picked) == wanted:
            break
        pool = on_profile if on_profile and rng.random() < ON_PROFILE_SHARE else catalogue
        course = rng.choice(pool)
        if course.id in seen:
            continue
        seen.add(course.id)
        picked.append(course)
    return picked


@dataclass
class _Clock:
    """A study clock that only ever moves forward, and never past `ceiling`.

    Drawing an independent hour per lesson looked plausible in isolation but
    produced lessons of the same day in random order, enrolments stamped after
    their own first lesson, and -- for anything landing on today -- timestamps
    a few hours into the future.
    """

    at: datetime
    ceiling: datetime

    def peek(self) -> datetime:
        return min(self.at, self.ceiling)

    def tick(self, rng: random.Random) -> datetime:
        moment = self.peek()
        self.at = moment + timedelta(minutes=rng.randint(5, 40))
        return moment

    def open_day(self, day: date, rng: random.Random) -> None:
        """Move to a morning on `day`, unless the clock is already past it."""
        self.at = max(self.at, _local(day, rng.randint(8, 11), rng.randint(0, 59)))


def _local(day: date, hour: int, minute: int) -> datetime:
    """Wall-clock time in the server's own timezone.

    Deliberately local rather than UTC: `study_activity.activity_date` is a
    plain date that the application fills with `date.today()`, and Postgres
    casts a timestamp to date in the session timezone too. Generating the
    moments in UTC put anything after 22:00 on the wrong day.
    """
    return datetime.combine(day, time(hour=hour, minute=minute)).astimezone()


# ---------------------------------------------------------------- the walk

def _study_one_student(
    db: Session,
    rng: random.Random,
    user: UserModel,
    catalogue: list[_CourseCard],
    lesson_cache: dict[int, list[_LessonCard]],
    now: datetime,
    totals: _Totals,
) -> set[int]:
    """Enroll `user` in a few courses and work through them. Returns the ids of
    the courses they rated, so their statistics can be refreshed once."""
    today = now.date()
    profile = _build_profile(rng, today)
    courses = _pick_courses(rng, profile, catalogue)
    if not courses:
        return set()

    for course in courses:
        if course.id not in lesson_cache:
            lesson_cache[course.id] = _course_lessons(db, course.id)

    # Pace the whole journey so it lands inside the student's window instead of
    # running past today and piling up on a single date.
    workload = sum(len(lesson_cache[course.id]) for course in courses)
    window = max(1, (today - profile.start_day).days)
    study_days = max(1, int(window * STUDY_DAY_SHARE))
    per_day = max(1, math.ceil(workload / study_days))

    clock = _Clock(at=datetime.min.replace(tzinfo=timezone.utc), ceiling=now)
    clock.open_day(profile.start_day, rng)

    enrollments = [
        EnrollmentModel(
            user_id=user.id,
            course_id=course.id,
            status=EnrollmentStatus.IN_PROGRESS,
        )
        for course in courses
    ]
    db.add_all(enrollments)
    db.flush()  # ids needed by the progress rows below

    progress_rows: list[LessonProgressModel] = []
    attempt_rows: list[LessonAttemptModel] = []
    tally: dict[date, _DayTally] = {}
    finished_at: dict[int, datetime | None] = {}
    rated: set[int] = set()

    day = profile.start_day
    left_today = per_day

    for course, enrollment in zip(courses, enrollments):
        lessons = lesson_cache[course.id]
        # The student signs up when they get to this course, not all at once on
        # day one, so the enrolment dates spread across the window too.
        enrollment.enrolled_at = clock.peek()
        first_seen: datetime | None = None
        last_seen: datetime | None = None
        stopped = False

        for lesson in lessons:
            # An assignment needs an instructor to grade it, so the student
            # gives up on this course and moves to the next one. No seeded
            # course has one today; the rule is here for when they do.
            if lesson.lesson_type == LessonType.ASSIGNMENT:
                stopped = True
                totals.abandoned_courses += 1
                break

            started_moment = clock.peek()
            if first_seen is None:
                first_seen = started_moment
            # Keyed by the moment's own date rather than by `day`: a long
            # session can push the clock past midnight, and the daily tally has
            # to match the timestamps it is summarising.
            row = tally.setdefault(started_moment.date(), _DayTally())
            row.started += 1

            best_score: float | None = None
            attempts = 0
            passed = True
            moment = started_moment

            if lesson.lesson_type in (LessonType.TEST, LessonType.MULTIPLE_SELECTION):
                passed = False
                for _ in range(MAX_QUIZ_ATTEMPTS):
                    attempts += 1
                    moment = clock.tick(rng)
                    score = _quiz_score(rng, profile.competence, lesson.question_count)
                    passed = score >= PASSING_SCORE
                    best_score = score if best_score is None else max(best_score, score)
                    attempt_rows.append(
                        LessonAttemptModel(
                            enrollment_id=enrollment.id,
                            lesson_id=lesson.id,
                            score=score,
                            passed=passed,
                            attempted_at=moment,
                        )
                    )
                    totals.attempts += 1
                    if passed:
                        break
                    totals.failed_attempts += 1
            else:
                moment = clock.tick(rng)

            last_seen = moment

            progress_rows.append(
                LessonProgressModel(
                    enrollment_id=enrollment.id,
                    lesson_id=lesson.id,
                    status=(
                        LessonProgressStatus.COMPLETED
                        if passed
                        else LessonProgressStatus.IN_PROGRESS
                    ),
                    started_at=started_moment,
                    completed_at=moment if passed else None,
                    last_activity_at=moment,
                    best_score=best_score,
                    attempts=attempts,
                )
            )

            if not passed:
                # Ran out of attempts on this quiz: the course stops here.
                stopped = True
                break

            totals.lessons += 1
            # Retries can carry the finish past midnight, so the completion is
            # counted on the date it actually happened.
            done = tally.setdefault(moment.date(), _DayTally())
            done.completed += 1
            done.seconds += lesson.duration_seconds or 0

            left_today -= 1
            if left_today <= 0:
                day = _next_day(rng, day, today)
                clock.open_day(day, rng)
                left_today = per_day

        enrollment.started_at = first_seen
        enrollment.last_activity_at = last_seen
        finished_at[enrollment.id] = None if stopped else last_seen

        if not stopped:
            totals.completed_courses += 1
            if rng.random() < RATED_SHARE:
                on_profile = (
                    course.category in profile.categories
                    and course.bucket == profile.duration
                )
                db.add(
                    CourseRatingModel(
                        user_id=user.id,
                        course_id=course.id,
                        score=rng.randint(4, 5) if on_profile else rng.randint(2, 4),
                    )
                )
                rated.add(course.id)
                totals.ratings += 1

        # A short break before starting the next course.
        day = _next_day(rng, day, today)
        clock.open_day(day, rng)

    db.bulk_save_objects(progress_rows)
    db.bulk_save_objects(attempt_rows)
    db.flush()

    for enrollment in enrollments:
        # The real recalculation, so the denormalised columns can never drift
        # from what the application itself would have written.
        _recalc_enrollment_progress(db, enrollment)
        # ...except for the timestamp, which it stamps with now().
        enrollment.completed_at = finished_at.get(enrollment.id)

    db.add_all(
        StudyActivityModel(
            user_id=user.id,
            activity_date=activity_date,
            lessons_started=row.started,
            lessons_completed=row.completed,
            seconds_studied=row.seconds,
        )
        # Aggregated in memory: uq_activity_user_date allows one row per day.
        for activity_date, row in sorted(tally.items())
    )

    _apply_preferences(db, user.id, profile)

    totals.students += 1
    totals.enrollments += len(enrollments)
    return rated


def _quiz_score(rng: random.Random, competence: float, questions: int) -> float:
    """Mirrors what `_grade_test` would have produced, without the answers.

    `LessonAttemptModel` stores only the score, so there is no need to build
    answer sets: how many questions the student gets right is enough.
    """
    if questions == 0:
        return 100.0  # a quiz with no questions is trivially passed
    correct = sum(1 for _ in range(questions) if rng.random() < competence)
    return (correct / questions) * 100.0


def _next_day(rng: random.Random, day: date, today: date) -> date:
    step = 1 + (rng.randint(1, 2) if rng.random() < REST_DAY_CHANCE else 0)
    return min(day + timedelta(days=step), today)


def _apply_preferences(db: Session, user_id: int, profile: _Profile) -> None:
    """Make the stated preferences match the behaviour.

    This is what feeds the content-based recommender; the enrollments alone
    only exercise the collaborative branch. Stored as enum *values*, the same
    shape `update_preferences` writes.
    """
    row = (
        db.query(RecommendationModel)
        .filter(RecommendationModel.user_id == user_id)
        .first()
    )
    if row is None:
        row = RecommendationModel(user_id=user_id)
        db.add(row)
    row.preferred_categories = [category.value for category in profile.categories]
    row.preferred_duration_buckets = [profile.duration.value]


# ---------------------------------------------------------------- entry points

def reset_simulation(db: Session) -> dict[str, int]:
    """Undo a previous run: wipe the demo students' activity, keep the accounts.

    Same deletion the admin panel runs when it promotes a student out of the
    role, so the rules for "what belongs to a student" live in one place.
    """
    totals = purge_student_data(db, [user.id for user in _demo_students(db)])
    db.commit()
    return totals


def simulate_students(db: Session, seed: int = RANDOM_SEED) -> dict[str, int]:
    """Give every demo student a study history.

    Additive by design: students who already have an enrollment are skipped, so
    running it twice does not double anyone up. Use `reset_simulation` to start
    over.
    """
    students = _demo_students(db)
    if not students:
        return _Totals().as_dict()

    catalogue = _catalogue(db)
    if not catalogue:
        return _Totals().as_dict()

    already_busy = {
        user_id
        for (user_id,) in db.query(EnrollmentModel.user_id)
        .filter(EnrollmentModel.user_id.in_([s.id for s in students]))
        .distinct()
    }

    rng = random.Random(seed)
    now = datetime.now().astimezone()
    lesson_cache: dict[int, list[_LessonCard]] = {}
    totals = _Totals()
    rated_course_ids: set[int] = set()

    for student in students:
        if student.id in already_busy:
            totals.skipped += 1
            continue
        rated_course_ids |= _study_one_student(
            db, rng, student, catalogue, lesson_cache, now, totals
        )
        db.commit()

    for course_id in sorted(rated_course_ids):
        refresh_course_rating_stats(db, course_id)
    db.commit()

    return totals.as_dict()
