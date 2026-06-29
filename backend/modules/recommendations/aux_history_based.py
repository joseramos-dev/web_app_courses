from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from sqlalchemy.orm import Session

from modules.course_ratings.model import CourseRatingModel
from modules.courses.duration_utils import duration_bucket
from modules.courses.model import (
    Category,
    CourseModel,
    CourseType,
    Difficulty,
    DurationBucket,
    Language,
    Site,
)
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus

MIN_SHARED_DIMENSIONS = 2
RATING_MAX = 5

CompletedWithRating = Tuple[CourseModel, int]


@dataclass
class HistoryProfile:
    sites: Dict[Site, float] = field(default_factory=dict)
    categories: Dict[Category, float] = field(default_factory=dict)
    languages: Dict[Language, float] = field(default_factory=dict)
    course_types: Dict[CourseType, float] = field(default_factory=dict)
    duration_buckets: Dict[DurationBucket, float] = field(default_factory=dict)
    difficulties: Dict[Difficulty, float] = field(default_factory=dict)


def fetch_completed_courses(db: Session, user_id: int) -> List[CourseModel]:
    return (
        db.query(CourseModel)
        .join(EnrollmentModel, EnrollmentModel.course_id == CourseModel.id)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.status == EnrollmentStatus.COMPLETED,
        )
        .all()
    )


def fetch_completed_with_ratings(
    db: Session, user_id: int
) -> List[CompletedWithRating]:
    rows = (
        db.query(CourseModel, CourseRatingModel.score)
        .join(EnrollmentModel, EnrollmentModel.course_id == CourseModel.id)
        .join(
            CourseRatingModel,
            (CourseRatingModel.course_id == CourseModel.id)
            & (CourseRatingModel.user_id == user_id),
        )
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.status == EnrollmentStatus.COMPLETED,
        )
        .all()
    )
    return [(course, int(score)) for course, score in rows]


def _frequency_map(values: List) -> Dict:
    if not values:
        return {}
    total = len(values)
    counts: Dict = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return {key: count / total for key, count in counts.items()}


def build_history_profile(completed: List[CourseModel]) -> HistoryProfile:
    if not completed:
        return HistoryProfile()

    duration_values = [
        duration_bucket(course.duration_seconds) for course in completed
    ]
    duration_values = [bucket for bucket in duration_values if bucket is not None]

    return HistoryProfile(
        sites=_frequency_map([course.site for course in completed]),
        categories=_frequency_map([course.category for course in completed]),
        languages=_frequency_map([course.language for course in completed]),
        course_types=_frequency_map([course.course_type for course in completed]),
        duration_buckets=_frequency_map(duration_values),
        difficulties=_frequency_map([course.difficulty for course in completed]),
    )


def history_match_ratio(course: CourseModel, profile: HistoryProfile) -> float:
    contributions: List[float] = []

    if profile.sites:
        contributions.append(profile.sites.get(course.site, 0.0))
    if profile.categories:
        contributions.append(profile.categories.get(course.category, 0.0))
    if profile.languages:
        contributions.append(profile.languages.get(course.language, 0.0))
    if profile.course_types:
        contributions.append(profile.course_types.get(course.course_type, 0.0))
    if profile.duration_buckets:
        bucket = duration_bucket(course.duration_seconds)
        contributions.append(
            profile.duration_buckets.get(bucket, 0.0) if bucket is not None else 0.0
        )
    if profile.difficulties:
        contributions.append(profile.difficulties.get(course.difficulty, 0.0))

    if not contributions:
        return 0.0
    return sum(contributions) / len(contributions)


def shared_dimensions(course_a: CourseModel, course_b: CourseModel) -> int:
    shared = 0
    if course_a.site == course_b.site:
        shared += 1
    if course_a.category == course_b.category:
        shared += 1
    if course_a.language == course_b.language:
        shared += 1
    if course_a.course_type == course_b.course_type:
        shared += 1
    bucket_a = duration_bucket(course_a.duration_seconds)
    bucket_b = duration_bucket(course_b.duration_seconds)
    if bucket_a is not None and bucket_a == bucket_b:
        shared += 1
    if course_a.difficulty == course_b.difficulty:
        shared += 1
    return shared


def similar_completed_rating_score(
    course: CourseModel,
    completed_with_ratings: List[CompletedWithRating],
) -> float | None:
    weighted_sum = 0.0
    weight_total = 0.0

    for completed_course, rating_score in completed_with_ratings:
        shared = shared_dimensions(course, completed_course)
        if shared < MIN_SHARED_DIMENSIONS:
            continue
        weight = float(shared)
        weighted_sum += weight * (rating_score / RATING_MAX)
        weight_total += weight

    if weight_total <= 0.0:
        return None
    return weighted_sum / weight_total
