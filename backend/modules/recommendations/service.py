import heapq
import logging
import time
from dataclasses import dataclass
from typing import Set

from sqlalchemy.orm import Session

from core.i18n import http_error

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
from modules.recommendations.aux_collaborative import (
    COLLABORATIVE_BLEND_WEIGHT,
    MIN_ENROLLMENTS_FOR_COLLABORATIVE,
    PREFERENCE_BLEND_WEIGHT,
    collaborative_course_scores,
)
from modules.recommendations.aux_content_based import (
    build_hybrid_recommendations,
    build_recommendations,
    enrolled_course_ids,
    fetch_candidate_courses_light,
    has_any_preferences,
    parse_profile_preferences,
    preference_match_ratio,
    score_courses_hybrid,
)
from modules.recommendations.aux_history_based import (
    HistoryProfile,
    build_history_profile,
    fetch_completed_courses,
)
from modules.recommendations.model import RecommendationModel
from modules.recommendations.schema import (
    ListCourseRecommendationsSchema,
    RecommendationSourceType,
    RecommendationUpdateSchema,
)
from modules.users.model import UserModel

logger = logging.getLogger(__name__)


@dataclass
class RecommendationContext:
    user_id: int
    profile: RecommendationModel
    sites: Set[Site]
    categories: Set[Category]
    languages: Set[Language]
    course_types: Set[CourseType]
    duration_buckets: Set[DurationBucket]
    difficulties: Set[Difficulty]
    enrolled_ids: Set[int]
    completed_courses: list
    history_profile: HistoryProfile
    active_enrollment_count: int


def _merged_excluded(ctx: RecommendationContext, extra: Set[int]) -> Set[int]:
    return ctx.enrolled_ids | extra


def create_default_recommendation(db: Session, user_id: int) -> RecommendationModel:
    existing = (
        db.query(RecommendationModel)
        .filter(RecommendationModel.user_id == user_id)
        .first()
    )
    if existing:
        return existing

    row = RecommendationModel(
        user_id=user_id,
        preferred_sites=[],
        preferred_categories=[],
        preferred_languages=[],
        preferred_course_types=[],
        preferred_duration_buckets=[],
        preferred_difficulties=[],
    )
    db.add(row)
    db.flush()
    return row


def get_or_create_recommendation(db: Session, user_id: int) -> RecommendationModel:
    row = (
        db.query(RecommendationModel)
        .filter(RecommendationModel.user_id == user_id)
        .first()
    )
    if row:
        return row
    return create_default_recommendation(db, user_id)


def update_preferences(
    db: Session,
    user: UserModel,
    payload: RecommendationUpdateSchema,
) -> RecommendationModel:
    row = get_or_create_recommendation(db, user.id)
    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if value is not None:
            setattr(
                row,
                field,
                [item.value if hasattr(item, "value") else item for item in value],
            )

    try:
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except Exception as e:
        db.rollback()
        raise http_error(500, "could_not_update_preferences", error=str(e)) from e


def _build_context(db: Session, user_id: int) -> RecommendationContext:
    profile = get_or_create_recommendation(db, user_id)
    (
        sites,
        categories,
        languages,
        course_types,
        duration_buckets,
        difficulties,
    ) = parse_profile_preferences(profile)

    enrolled_ids = enrolled_course_ids(db, user_id)
    completed_courses = fetch_completed_courses(db, user_id)
    history_profile = build_history_profile(completed_courses)

    return RecommendationContext(
        user_id=user_id,
        profile=profile,
        sites=sites,
        categories=categories,
        languages=languages,
        course_types=course_types,
        duration_buckets=duration_buckets,
        difficulties=difficulties,
        enrolled_ids=enrolled_ids,
        completed_courses=completed_courses,
        history_profile=history_profile,
        active_enrollment_count=len(enrolled_ids),
    )


def _top_scored_entries(scored: list, limit: int, key):
    return heapq.nlargest(limit, scored, key=key)


def recommend_courses_content_based(
    db: Session, ctx: RecommendationContext, limit: int, *, exclude: Set[int] | None = None
) -> ListCourseRecommendationsSchema:
    if not has_any_preferences(
        ctx.sites,
        ctx.categories,
        ctx.languages,
        ctx.course_types,
        ctx.duration_buckets,
        ctx.difficulties,
    ) and not ctx.completed_courses:
        return ListCourseRecommendationsSchema(recommendations=[])

    excluded = _merged_excluded(ctx, exclude or set())

    t0 = time.perf_counter()
    courses = fetch_candidate_courses_light(
        db,
        excluded,
        ctx.sites,
        ctx.categories,
        ctx.languages,
        ctx.course_types,
        ctx.duration_buckets,
        ctx.difficulties,
        ctx.history_profile,
    )
    logger.info(
        "recommendations fetch_candidates user=%s ms=%.1f count=%s",
        ctx.user_id,
        (time.perf_counter() - t0) * 1000,
        len(courses),
    )

    t1 = time.perf_counter()
    scored = score_courses_hybrid(
        courses,
        ctx.sites,
        ctx.categories,
        ctx.languages,
        ctx.course_types,
        ctx.duration_buckets,
        ctx.difficulties,
        ctx.history_profile,
    )
    logger.info(
        "recommendations score user=%s ms=%.1f",
        ctx.user_id,
        (time.perf_counter() - t1) * 1000,
    )

    if not scored:
        return ListCourseRecommendationsSchema(recommendations=[])

    top = _top_scored_entries(
        scored, limit, key=lambda item: (item[0], item[1], item[2])
    )

    t2 = time.perf_counter()
    recommendations = build_hybrid_recommendations(db, top)
    logger.info(
        "recommendations hydrate user=%s ms=%.1f",
        ctx.user_id,
        (time.perf_counter() - t2) * 1000,
    )
    return ListCourseRecommendationsSchema(recommendations=recommendations)


def _recommend_with_collaborative_and_preferences(
    db: Session, ctx: RecommendationContext, limit: int, *, exclude: Set[int] | None = None
) -> ListCourseRecommendationsSchema:
    excluded = _merged_excluded(ctx, exclude or set())

    t0 = time.perf_counter()
    collab_scores = collaborative_course_scores(db, ctx.user_id, excluded)
    logger.info(
        "recommendations collaborative user=%s ms=%.1f",
        ctx.user_id,
        (time.perf_counter() - t0) * 1000,
    )
    if not collab_scores:
        return ListCourseRecommendationsSchema(recommendations=[])

    if not has_any_preferences(
        ctx.sites,
        ctx.categories,
        ctx.languages,
        ctx.course_types,
        ctx.duration_buckets,
        ctx.difficulties,
    ):
        course_ids = list(collab_scores.keys())
        course_rows = with_course_computed_columns(
            db.query(CourseModel)
            .filter(
                CourseModel.id.in_(course_ids),
                CourseModel.is_public.is_(True),
            )
        ).all()
        course_by_id = {course.id: course for course in course_rows}
        scored: list[tuple[float, float, int]] = []
        for course_id, score in collab_scores.items():
            course = course_by_id.get(course_id)
            if course is None:
                continue
            rating = float(course.avg_rating) if course.avg_rating is not None else 0.0
            scored.append((score, rating, course_id))

        top = _top_scored_entries(
            scored, limit, key=lambda item: (item[0], item[1], item[2])
        )
        recommendations = build_recommendations(
            db, top, RecommendationSourceType.COLLABORATIVE
        )
        return ListCourseRecommendationsSchema(recommendations=recommendations)

    course_ids = list(collab_scores.keys())
    course_rows = with_course_computed_columns(
        db.query(CourseModel)
        .filter(
            CourseModel.id.in_(course_ids),
            CourseModel.is_public.is_(True),
        )
    ).all()
    course_by_id = {course.id: course for course in course_rows}

    blended: list[tuple[float, float, int]] = []
    for course_id, collab_score in collab_scores.items():
        course = course_by_id.get(course_id)
        if course is None:
            continue
        pref_ratio = preference_match_ratio(
            course,
            ctx.sites,
            ctx.categories,
            ctx.languages,
            ctx.course_types,
            ctx.duration_buckets,
            ctx.difficulties,
        )
        if pref_ratio <= 0.0:
            continue
        combined = (
            COLLABORATIVE_BLEND_WEIGHT * collab_score
            + PREFERENCE_BLEND_WEIGHT * pref_ratio
        )
        rating = float(course.avg_rating) if course.avg_rating is not None else 0.0
        blended.append((combined, rating, course_id))

    if not blended:
        return ListCourseRecommendationsSchema(recommendations=[])

    top = _top_scored_entries(
        blended, limit, key=lambda item: (item[0], item[1], item[2])
    )
    recommendations = build_recommendations(
        db, top, RecommendationSourceType.HYBRID
    )
    return ListCourseRecommendationsSchema(recommendations=recommendations)


def recommend_courses(
    db: Session, user_id: int, limit: int, *, exclude: Set[int] | None = None
) -> ListCourseRecommendationsSchema:
    started = time.perf_counter()
    exclude = exclude or set()

    t0 = time.perf_counter()
    ctx = _build_context(db, user_id)
    logger.info(
        "recommendations context user=%s ms=%.1f",
        user_id,
        (time.perf_counter() - t0) * 1000,
    )

    if ctx.active_enrollment_count < MIN_ENROLLMENTS_FOR_COLLABORATIVE:
        result = recommend_courses_content_based(db, ctx, limit, exclude=exclude)
    else:
        blended = _recommend_with_collaborative_and_preferences(
            db, ctx, limit, exclude=exclude
        )
        if blended.recommendations:
            result = blended
        else:
            result = recommend_courses_content_based(db, ctx, limit, exclude=exclude)

    logger.info(
        "recommendations total user=%s ms=%.1f count=%s",
        user_id,
        (time.perf_counter() - started) * 1000,
        len(result.recommendations),
    )
    return result
