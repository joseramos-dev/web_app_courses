"""Demo data generation, shared by the CLI scripts and the dev endpoints.

Lives under `modules/dev` rather than `scripts/` so the admin dashboard can
trigger the same code the command line runs: one implementation, two entry
points.
"""

from __future__ import annotations

import json
import os
import random
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.security import hash_password
from modules.course_ratings.model import CourseRatingModel
from modules.course_ratings.stats import refresh_course_rating_stats
from modules.courses.model import CourseModel
from modules.recommendations.model import RecommendationModel
from modules.topics.model import TopicModel
from modules.topics.schema import CurriculumImportSchema
from modules.topics.service import import_curriculum
from modules.users.model import UserModel, UserRole

SEED_DIR = Path(__file__).resolve().parents[2] / "seed_data"
RANDOM_SEED = 42

# Each course takes a different run of its category's seven topics, so two
# courses in the same category do not read identically. Repeats are allowed and
# numbered, which is what lets a course reach twenty topics from a pool of seven.
MIN_TOPICS = 2
MAX_TOPICS = 20

_ROMAN = ["", "", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

# Demo accounts carry a recognisable prefix so they can be told apart from real
# users and removed in one go. Their password is their own username, which makes
# them trivial to log into by hand or from a load-test script.
DEMO_STUDENT_PREFIX = "demo_student_"
DEMO_INSTRUCTOR_PREFIX = "demo_instructor_"
INSTRUCTOR_SHARE = 0.15


# ---------------------------------------------------------------- curricula

def load_content() -> tuple[dict[str, list[dict]], list[str]]:
    """Read the topic bank and the video pool from seed_data/."""
    videos = json.loads((SEED_DIR / "videos.json").read_text(encoding="utf-8"))["videos"]
    if not videos:
        raise ValueError("seed_data/videos.json has no URLs")

    # Recognised by shape rather than by filename, so dropping another kind of
    # seed file in this folder does not break the loader.
    banks: dict[str, list[dict]] = {}
    for path in sorted(SEED_DIR.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(doc, dict) and "category" in doc and "topics" in doc:
            banks[doc["category"]] = doc["topics"]
    return banks, videos


def build_payload(
    topics: list[dict], videos: list[str], rng: random.Random
) -> CurriculumImportSchema:
    """Pick a random run of topics and hand the video lessons a URL.

    The bank leaves `video_url` out on purpose: filling it here means a dead
    video is fixed by editing `videos.json` alone, not eleven category files.
    """
    how_many = rng.randint(MIN_TOPICS, min(MAX_TOPICS, len(topics) * 3))
    seen: dict[str, int] = {}
    chosen: list[dict] = []

    for _ in range(how_many):
        topic = json.loads(json.dumps(rng.choice(topics)))  # deep copy, bank is reused

        seen[topic["name"]] = seen.get(topic["name"], 0) + 1
        if seen[topic["name"]] > 1:
            suffix = _ROMAN[min(seen[topic["name"]], len(_ROMAN) - 1)]
            topic["name"] = f"{topic['name']} {suffix}"

        for lesson in topic["lessons"]:
            if lesson["lesson_type"] == "video":
                lesson["video_url"] = rng.choice(videos)
        chosen.append(topic)

    return CurriculumImportSchema(topics=chosen)


def seed_missing_curricula(db: Session) -> dict[str, int]:
    """Give a curriculum to every categorised course that has none.

    Skipping the already-seeded ones is what makes this safe to re-run:
    `import_curriculum` appends, so without the filter a second pass would give
    every course a second set of topics.
    """
    banks, videos = load_content()
    rng = random.Random(RANDOM_SEED)

    seeded = select(TopicModel.course_id).distinct()
    courses = (
        db.query(CourseModel)
        .filter(
            CourseModel.category.in_(list(banks)),
            CourseModel.id.notin_(seeded),
        )
        .order_by(CourseModel.id)
        .all()
    )

    totals = {"courses": 0, "topics": 0, "lessons": 0, "questions": 0}
    for course in courses:
        payload = build_payload(banks[course.category.value], videos, rng)
        result = import_curriculum(db, course.id, payload)
        totals["courses"] += 1
        totals["topics"] += result.topics_created
        totals["lessons"] += result.lessons_created
        totals["questions"] += result.questions_created
    return totals


# ---------------------------------------------------------------- accounts

def _hash_many(passwords: list[str]) -> list[str]:
    """Hash a batch of passwords in parallel.

    Each demo account uses its own username as password, so there is no single
    hash to reuse and bcrypt's ~190 ms lands once per account -- 18 seconds for
    a hundred, three minutes for a thousand. bcrypt releases the GIL while it
    works, so threads give a real speedup here (measured ~6x on this machine).
    """
    if not passwords:
        return []
    workers = min(8, max(1, (os.cpu_count() or 2)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(hash_password, passwords))


def seed_demo_users(db: Session, count: int) -> dict[str, int]:
    """Create `count` demo accounts, mostly students plus a few instructors.

    Every account's password is its own username.

    Numbering continues from whatever demo users already exist, so calling this
    twice adds accounts instead of colliding on the unique name.
    """

    def next_index(prefix: str) -> int:
        existing = (
            db.query(UserModel.name)
            .filter(UserModel.name.like(f"{prefix}%"))
            .all()
        )
        highest = 0
        for (name,) in existing:
            suffix = name[len(prefix):]
            if suffix.isdigit():
                highest = max(highest, int(suffix))
        return highest + 1

    n_instructors = max(1, round(count * INSTRUCTOR_SHARE))
    n_students = count - n_instructors
    student_from = next_index(DEMO_STUDENT_PREFIX)
    instructor_from = next_index(DEMO_INSTRUCTOR_PREFIX)

    names = [
        (f"{DEMO_STUDENT_PREFIX}{student_from + i:04d}", UserRole.STUDENT)
        for i in range(n_students)
    ] + [
        (f"{DEMO_INSTRUCTOR_PREFIX}{instructor_from + i:04d}", UserRole.INSTRUCTOR)
        for i in range(n_instructors)
    ]
    hashes = _hash_many([name for name, _ in names])

    created = [
        UserModel(
            name=name,
            email=f"{name}@demo.local",
            role=role,
            hash_password=digest,
        )
        for (name, role), digest in zip(names, hashes)
    ]

    db.add_all(created)
    db.flush()
    # Registration normally creates this row; bulk creation bypasses that path.
    db.add_all(
        RecommendationModel(
            user_id=user.id,
            preferred_sites=[],
            preferred_categories=[],
            preferred_languages=[],
            preferred_course_types=[],
            preferred_duration_buckets=[],
            preferred_difficulties=[],
        )
        for user in created
    )
    db.commit()

    return {
        "students": n_students,
        "instructors": n_instructors,
        "total": len(created),
    }


def delete_demo_users(db: Session) -> int:
    """Remove every demo account. Cascades clear their enrollments and progress.

    Ratings cascade too, but `courses.avg_rating` and `ratings_count` are
    denormalised: nothing recomputes them when rows vanish underneath, so the
    courses these accounts rated are refreshed afterwards. Without this the
    catalogue would keep advertising an average nobody voted for.
    """
    users = (
        db.query(UserModel)
        .filter(
            UserModel.name.like(f"{DEMO_STUDENT_PREFIX}%")
            | UserModel.name.like(f"{DEMO_INSTRUCTOR_PREFIX}%")
        )
        .all()
    )
    if not users:
        return 0

    user_ids = [user.id for user in users]
    rated_course_ids = [
        course_id
        for (course_id,) in db.query(CourseRatingModel.course_id)
        .filter(CourseRatingModel.user_id.in_(user_ids))
        .distinct()
    ]

    for user in users:
        db.delete(user)
    db.flush()

    for course_id in rated_course_ids:
        refresh_course_rating_stats(db, course_id)
    db.commit()
    return len(users)


def import_users(db: Session, entries: list) -> dict[str, int]:
    """Create accounts from an explicit list.

    Every entry becomes a student, and the password defaults to the account's
    own name -- the point is bulk test users you can log into without looking
    anything up. Names and emails already taken are skipped rather than raising,
    so re-running the same file is harmless.
    """
    taken_names = {name for (name,) in db.query(UserModel.name).all()}
    taken_emails = {email for (email,) in db.query(UserModel.email).all()}

    pending: list = []
    skipped = 0
    for entry in entries:
        if entry.name in taken_names or entry.email in taken_emails:
            skipped += 1
            continue
        # Guard against the file itself repeating a name or email.
        taken_names.add(entry.name)
        taken_emails.add(entry.email)
        pending.append(entry)

    hashes = _hash_many([entry.password or entry.name for entry in pending])
    created = [
        UserModel(
            name=entry.name,
            email=entry.email,
            role=UserRole.STUDENT,
            hash_password=digest,
        )
        for entry, digest in zip(pending, hashes)
    ]

    db.add_all(created)
    db.flush()
    db.add_all(
        RecommendationModel(
            user_id=user.id,
            preferred_sites=[],
            preferred_categories=[],
            preferred_languages=[],
            preferred_course_types=[],
            preferred_duration_buckets=[],
            preferred_difficulties=[],
        )
        for user in created
    )
    db.commit()

    return {"created": len(created), "skipped": skipped}
