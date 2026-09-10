from dataclasses import dataclass
from typing import List, Set, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Query, Session

from modules.courses.duration_utils import duration_bucket, duration_bucket_or_conditions
from modules.courses.model import (
    Category,
    CourseModel,
    CourseType,
    Difficulty,
    DurationBucket,
    Language,
    Site,
)
from modules.courses.query_utils import with_course_computed_columns
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.recommendations.aux_history_based import (
    HistoryProfile,
    history_match_ratio,
)
from modules.recommendations.model import RecommendationModel
from modules.recommendations.schema import (
    CourseRecommendationSchema,
    RecommendationSourceType,
)

ScoredEntry = Tuple[float, float, int]
HybridScoredEntry = Tuple[float, float, int, RecommendationSourceType]

CANDIDATE_CAP = 400
RATING_MAX = 5


@dataclass(frozen=True)
class ScoringCourse:
    id: int
    site: Site
    category: Category
    language: Language
    course_type: CourseType
    duration_seconds: int | None
    difficulty: Difficulty
    avg_rating: float | None


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
    course,
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
) -> float:
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


def apply_candidate_prefilter(
    query: Query,
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
    history_profile: HistoryProfile,
    *,
    use_preferences: bool,
) -> Query:
    conditions = []

    if use_preferences:
        if sites:
            conditions.append(CourseModel.site.in_(sites))
        if categories:
            conditions.append(CourseModel.category.in_(categories))
        if languages:
            conditions.append(CourseModel.language.in_(languages))
        if course_types:
            conditions.append(CourseModel.course_type.in_(course_types))
        if duration_buckets:
            conditions.extend(duration_bucket_or_conditions(list(duration_buckets)))
        if difficulties:
            conditions.append(CourseModel.difficulty.in_(difficulties))
    elif profile_has_history(history_profile):
        if history_profile.sites:
            conditions.append(CourseModel.site.in_(history_profile.sites.keys()))
        if history_profile.categories:
            conditions.append(
                CourseModel.category.in_(history_profile.categories.keys())
            )
        if history_profile.languages:
            conditions.append(
                CourseModel.language.in_(history_profile.languages.keys())
            )
        if history_profile.course_types:
            conditions.append(
                CourseModel.course_type.in_(history_profile.course_types.keys())
            )
        if history_profile.duration_buckets:
            conditions.extend(
                duration_bucket_or_conditions(
                    list(history_profile.duration_buckets.keys())
                )
            )
        if history_profile.difficulties:
            conditions.append(
                CourseModel.difficulty.in_(history_profile.difficulties.keys())
            )

    if conditions:
        query = query.filter(or_(*conditions))
    return query


def fetch_candidate_courses_light(
    db: Session,
    excluded: Set[int],
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
    history_profile: HistoryProfile,
) -> List[ScoringCourse]:
    query = db.query(
        CourseModel.id,
        CourseModel.site,
        CourseModel.category,
        CourseModel.language,
        CourseModel.course_type,
        CourseModel.duration_seconds,
        CourseModel.difficulty,
        CourseModel.avg_rating,
    ).filter(CourseModel.is_public.is_(True))

    if excluded:
        query = query.filter(CourseModel.id.notin_(excluded))

    use_preferences = has_any_preferences(
        sites,
        categories,
        languages,
        course_types,
        duration_buckets,
        difficulties,
    )
    query = apply_candidate_prefilter(
        query,
        sites,
        categories,
        languages,
        course_types,
        duration_buckets,
        difficulties,
        history_profile,
        use_preferences=use_preferences,
    )

    query = query.order_by(
        CourseModel.avg_rating.desc().nullslast(),
        CourseModel.id,
    ).limit(CANDIDATE_CAP)

    rows = query.all()
    return [
        ScoringCourse(
            id=row.id,
            site=row.site,
            category=row.category,
            language=row.language,
            course_type=row.course_type,
            duration_seconds=row.duration_seconds,
            difficulty=row.difficulty,
            avg_rating=row.avg_rating,
        )
        for row in rows
    ]


def score_courses_hybrid(
    courses: List[ScoringCourse],
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
    duration_buckets: Set[DurationBucket],
    difficulties: Set[Difficulty],
    history_profile: HistoryProfile,
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

        tiebreaker_rating = (
            float(course.avg_rating) / RATING_MAX
            if course.avg_rating is not None
            else 0.0
        )
        source_type = resolve_source_type(preference_ratio, history_ratio)
        scored.append(
            (content_score, tiebreaker_rating, course.id, source_type)
        )

    return scored


def _hydrate_courses_by_id(db: Session, course_ids: List[int]) -> dict[int, CourseModel]:
    if not course_ids:
        return {}
    course_rows = (
        with_course_computed_columns(
            db.query(CourseModel).filter(CourseModel.id.in_(course_ids))
        ).all()
    )
    return {course.id: course for course in course_rows}


def build_recommendations(
    db: Session,
    top: List[ScoredEntry],
    source_type: RecommendationSourceType,
) -> List[CourseRecommendationSchema]:
    top_ids = [course_id for _, _, course_id in top]
    course_by_id = _hydrate_courses_by_id(db, top_ids)

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
    top_ids = [course_id for _, _, course_id, _ in top]
    course_by_id = _hydrate_courses_by_id(db, top_ids)

    recommendations: List[CourseRecommendationSchema] = []
    for content_score, _tiebreaker, course_id, source_type in top:
        course = course_by_id.get(course_id)
        if course is None:
            continue
        recommendations.append(
            CourseRecommendationSchema(
                course=course,
                recommendation_percent=recommendation_percent(content_score),
                source_type=source_type,
            )
        )
    return recommendations
