from sqlalchemy.orm import Session

from core.i18n import http_error

from modules.recommendations.aux_collaborative import (
    MIN_ENROLLMENTS_FOR_COLLABORATIVE,
    count_active_enrollments,
    recommend_courses_collaborative,
)
from modules.recommendations.aux_content_based import (
    build_hybrid_recommendations,
    enrolled_course_ids,
    fetch_candidate_courses,
    has_any_preferences,
    parse_profile_preferences,
    score_courses_hybrid,
)
from modules.recommendations.aux_history_based import (
    build_history_profile,
    fetch_completed_courses,
    fetch_completed_with_ratings,
)
from modules.recommendations.model import RecommendationModel
from modules.recommendations.schema import (
    ListCourseRecommendationsSchema,
    RecommendationUpdateSchema,
)
from modules.users.model import UserModel


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


# TODO: IMPLEMENTAR CON REDIS CACHE DE RECOMENDACIONES
def recommend_courses_content_based(
    db: Session, user_id: int, limit: int
) -> ListCourseRecommendationsSchema:
    profile = get_or_create_recommendation(db, user_id)
    (
        sites,
        categories,
        languages,
        course_types,
        duration_buckets,
        difficulties,
    ) = parse_profile_preferences(profile)

    completed_courses = fetch_completed_courses(db, user_id)
    history_profile = build_history_profile(completed_courses)
    completed_with_ratings = fetch_completed_with_ratings(db, user_id)

    if not has_any_preferences(
        sites,
        categories,
        languages,
        course_types,
        duration_buckets,
        difficulties,
    ) and not completed_courses:
        return ListCourseRecommendationsSchema(recommendations=[])

    excluded = enrolled_course_ids(db, user_id)
    courses = fetch_candidate_courses(db, excluded)
    scored = score_courses_hybrid(
        courses,
        sites,
        categories,
        languages,
        course_types,
        duration_buckets,
        difficulties,
        history_profile,
        completed_with_ratings,
    )

    if not scored:
        return ListCourseRecommendationsSchema(recommendations=[])

    scored.sort(key=lambda item: (-item[0], -item[2], item[3]))
    top = scored[:limit]

    recommendations = build_hybrid_recommendations(db, top)
    return ListCourseRecommendationsSchema(recommendations=recommendations)


def recommend_courses(
    db: Session, user_id: int, limit: int
) -> ListCourseRecommendationsSchema:
    active_count = count_active_enrollments(db, user_id)
    if active_count < MIN_ENROLLMENTS_FOR_COLLABORATIVE:
        return recommend_courses_content_based(db, user_id, limit)

    collaborative = recommend_courses_collaborative(db, user_id, limit)
    if collaborative.recommendations:
        return collaborative

    return recommend_courses_content_based(db, user_id, limit)
