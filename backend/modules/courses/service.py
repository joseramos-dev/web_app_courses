import random
from collections import defaultdict
from pathlib import Path

import pandas as pd

from sqlalchemy.orm import Session

from core.i18n import http_error
from modules.courses.model import CourseModel, Difficulty
from modules.courses.query_utils import with_course_computed_columns
from modules.courses.schema import CourseCreateSchema, CourseUpdateSchema
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.notifications.service import notify_course_visibility_to_enrolled
from modules.topics.service import create_default_topic
from modules.users.model import UserRole


DEFAULT_SAMPLE_SIZE = 300
UNCATEGORIZED = "Non defined"
_SEED_RANDOM = 42


def _sample_by_category(
    rows: list[dict], sample_size: int, already_imported: set[str] | None = None
) -> list[dict]:
    """Pick `sample_size` courses spread across the categories.

    A plain random sample follows the CSV's own skew -- 897 of the 2819
    categorised courses are `business` and only 22 are `math and logic`, so a
    sample of 300 would leave some categories with one or two courses and the
    catalogue filters with nothing to show. Taking one course per category per
    round keeps every category represented and lets the small ones run out
    naturally.

    `already_imported` holds the titles already in the catalogue. Importing is
    additive -- nothing is ever deleted -- but the random seed is fixed so that
    a run is reproducible, and without this filter a second run would re-import
    the very same 300 courses as literal duplicates instead of bringing new
    ones.
    """
    seen = already_imported or set()
    buckets: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        if row.get("category") and row["category"] != UNCATEGORIZED:
            if row.get("title") in seen:
                continue
            buckets[row["category"]].append(row)

    rng = random.Random(_SEED_RANDOM)
    for bucket in buckets.values():
        rng.shuffle(bucket)

    picked: list[dict] = []
    categories = sorted(buckets)
    while len(picked) < sample_size:
        drained = True
        for category in categories:
            if not buckets[category]:
                continue
            drained = False
            picked.append(buckets[category].pop())
            if len(picked) >= sample_size:
                break
        if drained:
            break  # fewer categorised courses than requested
    return picked


def populate_courses(db: Session, sample_size: int = DEFAULT_SAMPLE_SIZE):
    """Import a categorised sample of the Kaggle catalogue.

    Only a sample: the full 5273 rows are catalogue entries with no lessons,
    and a smaller set that can actually be seeded with content is far more
    useful for exercising the application.

    Additive: existing courses are never removed, and each run brings courses
    that are not in the catalogue yet, so calling it repeatedly grows the
    catalogue instead of duplicating it.
    """
    file_path = Path("data_analysis/online_courses_clean.csv")
    if not file_path.is_file():
        raise http_error(
            404,
            "file_not_found_path",
            path=str(file_path.absolute()),
        )
    try:
        already_imported = {
            title for (title,) in db.query(CourseModel.title).all()
        }
        data = pd.read_csv(file_path).to_dict(orient="records")
        data = _sample_by_category(data, sample_size, already_imported)

        rng = random.Random(_SEED_RANDOM)
        difficulties = list(Difficulty)
        for row in data:
            row.pop("rating", None)
            # The CSV carries no difficulty, so every course used to land on
            # the column default and the filter had a single value to offer.
            row["difficulty"] = rng.choice(difficulties)

        db.bulk_insert_mappings(CourseModel, data)
        db.commit()
        return len(data)
    except Exception as e:
        db.rollback()
        raise http_error(500, "database_error", error=str(e)) from e


def _user_can_view_course(db: Session, course: CourseModel, user) -> bool:
    if course.is_public:
        return True
    if user is None:
        return False
    if user.role == UserRole.ADMIN:
        return True
    if course.instructor_id is not None and user.id == course.instructor_id:
        return True
    enrollment = (
        db.query(EnrollmentModel)
        .filter(
            EnrollmentModel.user_id == user.id,
            EnrollmentModel.course_id == course.id,
            EnrollmentModel.status != EnrollmentStatus.DROPPED,
        )
        .first()
    )
    return enrollment is not None


def get_course_detail(db: Session, course_id: int, user=None):
    course = (
        with_course_computed_columns(
            db.query(CourseModel).filter(CourseModel.id == course_id)
        ).first()
    )
    if not course:
        raise http_error(404, "course_not_found")
    if not _user_can_view_course(db, course, user):
        raise http_error(404, "course_not_found")
    return course


def get_course_edit_stats(db: Session, course_id: int) -> dict:
    course = (
        with_course_computed_columns(
            db.query(CourseModel).filter(CourseModel.id == course_id)
        ).first()
    )
    if not course:
        raise http_error(404, "course_not_found")
    enrollments_count = (
        db.query(EnrollmentModel)
        .filter(
            EnrollmentModel.course_id == course_id,
            EnrollmentModel.status != EnrollmentStatus.DROPPED,
        )
        .count()
    )
    return {
        "enrollments_count": enrollments_count,
        "topics_count": course.topics_count or 0,
        "lessons_count": course.lessons_count or 0,
        "duration_seconds": course.duration_seconds,
    }


def update_course(db: Session, course_id: int, payload: CourseUpdateSchema, user=None):
    course = get_course_detail(db, course_id, user=user)
    updates = payload.model_dump(exclude_unset=True)
    visibility_changed = (
        "is_public" in updates and updates["is_public"] != course.is_public
    )
    for k, v in updates.items():
        setattr(course, k, v)
    db.add(course)
    try:
        db.flush()
        if visibility_changed:
            notify_course_visibility_to_enrolled(
                db,
                course_id=course.id,
                course_title=course.title,
                is_public=course.is_public,
            )
        db.commit()
    except Exception as e:
        db.rollback()
        raise http_error(500, "database_error", error=str(e)) from e
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: int) -> None:
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if not course:
        raise http_error(404, "course_not_found")
    try:
        db.delete(course)
        db.commit()
    except Exception as e:
        db.rollback()
        raise http_error(500, "database_error", error=str(e)) from e


def create_course(
    db: Session,
    payload: CourseCreateSchema,
    instructor_id: int | None,
):
    data = payload.model_dump(exclude_unset=True)
    data.pop("instructor_id", None)
    url_raw = data.pop("url", None)
    url = (url_raw or "").strip()
    if "difficulty" not in data:
        data["difficulty"] = Difficulty.INTERMEDIATE
    course = CourseModel(**data, url=url or "", instructor_id=instructor_id)
    db.add(course)
    try:
        db.flush()
        create_default_topic(db, course.id)
        db.commit()
    except Exception as e:
        db.rollback()
        raise http_error(500, "database_error", error=str(e)) from e
    db.refresh(course)
    return course
