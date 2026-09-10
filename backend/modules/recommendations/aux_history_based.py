from dataclasses import dataclass, field
from typing import Dict, List

from sqlalchemy.orm import Session

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


def history_match_ratio(course, profile: HistoryProfile) -> float:
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
