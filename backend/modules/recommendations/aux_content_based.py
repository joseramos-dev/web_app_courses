from typing import List, Set, Tuple

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
from modules.recommendations.aux_history_based import (
    CompletedWithRating,
    HistoryProfile,
    RATING_MAX,
    similar_completed_rating_score,
    history_match_ratio,
)
from modules.recommendations.model import RecommendationModel
from modules.recommendations.schema import (
    CourseRecommendationSchema,
    RecommendationSourceType,
)

ScoredEntry = Tuple[float, float, int]
HybridScoredEntry = Tuple[float, float, float, int, RecommendationSourceType]

CONTENT_WEIGHT = 0.65
RATING_WEIGHT = 0.35
DEFAULT_RATING_NORMALIZED = 0.5


def enum_values(values: list | None, enum_cls) -> Set:
    if not values:
        return set()
    return {v if isinstance(v, enum_cls) else enum_cls(v) for v in values}


def has_any_preferences(
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
) -> bool:
    return bool(
        sites
        or categories
        or languages
        or course_types
        or duration_buckets
        or difficulties
    )


def profile_has_history(profile: HistoryProfile) -> bool:
    return bool(
        profile.sites
        or profile.categories
        or profile.languages
        or profile.course_types
        or profile.duration_buckets
        or profile.difficulties
    )


def preference_match_ratio(
    course: CourseModel,
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
) -> float:
    """
    Score in [0, 1]: share of *selected* dimensions the course satisfies.
    Unselected dimensions are ignored. Partial matches are allowed (e.g. 2/4 → 0.5).
    """
    selected = 0
    matches = 0

    if sites:
        selected += 1
        if course.site in sites:
            matches += 1
    if categories:
        selected += 1
        if course.category in categories:
            matches += 1
    if languages:
        selected += 1
        if course.language in languages:
            matches += 1
    if course_types:
        selected += 1
        if course.course_type in course_types:
            matches += 1
    if duration_buckets:
        selected += 1
        bucket = duration_bucket(course.duration_seconds)
        if bucket is not None and bucket in duration_buckets:
            matches += 1
    if difficulties:
        selected += 1
        if course.difficulty in difficulties:
            matches += 1

    if selected == 0:
        return 0.0
    return matches / selected


def resolve_source_type(
    preference_ratio: float, history_ratio: float
) -> RecommendationSourceType:
    if preference_ratio > 0.0:
        return RecommendationSourceType.PREFERENCES
    if history_ratio > 0.0:
        return RecommendationSourceType.HISTORY
    return RecommendationSourceType.PREFERENCES


def compute_rating_signal(
    course: CourseModel,
    completed_with_ratings: List[CompletedWithRating],
) -> float:
    similar_score = similar_completed_rating_score(course, completed_with_ratings)
    if similar_score is not None:
        return similar_score
    if course.rating is not None:
        return float(course.rating) / RATING_MAX
    return DEFAULT_RATING_NORMALIZED


def compute_final_score(content_score: float, rating_signal: float) -> float:
    return CONTENT_WEIGHT * content_score + RATING_WEIGHT * rating_signal


def recommendation_percent(normalized_score: float) -> float:
    return round(normalized_score * 100, 1)


def parse_profile_preferences(
    profile: RecommendationModel,
) -> Tuple[
    Set[Site],
    Set[Category],
    Set[Language],
    Set[CourseType],
    Set[DurationBucket],
    Set[Difficulty],
]:
    return (
        enum_values(profile.preferred_sites, Site),
        enum_values(profile.preferred_categories, Category),
        enum_values(profile.preferred_languages, Language),
        enum_values(profile.preferred_course_types, CourseType),
        enum_values(profile.preferred_duration_buckets, DurationBucket),
        enum_values(profile.preferred_difficulties, Difficulty),
    )


def enrolled_course_ids(db: Session, user_id: int) -> Set[int]:
    rows = (
        db.query(EnrollmentModel.course_id)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.status.in_(
                [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.COMPLETED]
            ),
        )
        .all()
    )
    return {row[0] for row in rows}


def fetch_candidate_courses(db: Session, excluded: Set[int]) -> List[CourseModel]:
    query = db.query(CourseModel)
    if excluded:
        query = query.filter(CourseModel.id.notin_(excluded))
    return query.all()


def score_courses_hybrid(
    courses: List[CourseModel],
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
    history_profile: HistoryProfile,
    completed_with_ratings: List[CompletedWithRating],
) -> List[HybridScoredEntry]:
    use_history = profile_has_history(history_profile)
    scored: List[HybridScoredEntry] = []

    for course in courses:
        preference_ratio = preference_match_ratio(
            course,
            sites,
            categories,
            languages,
            course_types,
            duration_buckets,
            difficulties,
        )
        history_ratio = (
            history_match_ratio(course, history_profile) if use_history else 0.0
        )
        content_score = max(preference_ratio, history_ratio)
        if content_score <= 0.0:
            continue

        rating_signal = compute_rating_signal(course, completed_with_ratings)
        final_score = compute_final_score(content_score, rating_signal)
        source_type = resolve_source_type(preference_ratio, history_ratio)
        scored.append(
            (final_score, content_score, rating_signal, course.id, source_type)
        )

    return scored


def score_courses(
    courses: List[CourseModel],
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
) -> List[ScoredEntry]:
    scored: List[ScoredEntry] = []
    for course in courses:
        ratio = preference_match_ratio(
            course,
            sites,
            categories,
            languages,
            course_types,
            duration_buckets,
            difficulties,
        )
        if ratio <= 0.0:
            continue
        rating = float(course.rating) if course.rating is not None else 0.0
        scored.append((ratio, rating, course.id))
    return scored


def build_recommendations(
    db: Session,
    top: List[ScoredEntry],
    source_type: RecommendationSourceType,
) -> List[CourseRecommendationSchema]:
    top_ids = [course_id for _, _, course_id in top]
    course_rows = db.query(CourseModel).filter(CourseModel.id.in_(top_ids)).all()
    course_by_id = {course.id: course for course in course_rows}

    recommendations: List[CourseRecommendationSchema] = []
    for ratio, _rating, course_id in top:
        course = course_by_id.get(course_id)
        if course is None:
            continue
        recommendations.append(
            CourseRecommendationSchema(
                course=course,
                recommendation_percent=recommendation_percent(ratio),
                source_type=source_type,
            )
        )
    return recommendations


def build_hybrid_recommendations(
    db: Session,
    top: List[HybridScoredEntry],
) -> List[CourseRecommendationSchema]:
    top_ids = [course_id for _, _, _, course_id, _ in top]
    course_rows = db.query(CourseModel).filter(CourseModel.id.in_(top_ids)).all()
    course_by_id = {course.id: course for course in course_rows}

    recommendations: List[CourseRecommendationSchema] = []
    for final_score, _content_score, _rating_signal, course_id, source_type in top:
        course = course_by_id.get(course_id)
        if course is None:
            continue
        recommendations.append(
            CourseRecommendationSchema(
                course=course,
                recommendation_percent=recommendation_percent(final_score),
                source_type=source_type,
            )
        )
    return recommendations
