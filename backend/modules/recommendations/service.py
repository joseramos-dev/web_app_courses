from typing import List, Set

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modules.courses.model import Category, CourseModel, CourseType, Language, Site
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.recommendations.model import RecommendationModel
from modules.recommendations.schema import (
    CourseRecommendationSchema,
    ListCourseRecommendationsSchema,
    RecommendationSourceType,
    RecommendationUpdateSchema,
)
from modules.users.model import UserModel

_MAX_PREFERENCE_SCORE = 4


def _enum_values(values: list | None, enum_cls) -> Set:
    if not values:
        return set()
    return {v if isinstance(v, enum_cls) else enum_cls(v) for v in values}


def _has_any_preferences(
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
) -> bool:
    return bool(sites or categories or languages or course_types)


def _score_course(
    course: CourseModel,
    sites: Set[Site],
    categories: Set[Category],
    languages: Set[Language],
    course_types: Set[CourseType],
) -> int:
    score = 0
    if course.site in sites:
        score += 1
    if course.category in categories:
        score += 1
    if course.language in languages:
        score += 1
    if course.course_type in course_types:
        score += 1
    return score


def _recommendation_percent(score: int) -> float:
    if score <= 0:
        return 0.0
    return round((score / _MAX_PREFERENCE_SCORE) * 100, 1)


def _enrolled_course_ids(db: Session, user_id: int) -> Set[int]:
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
        raise HTTPException(
            status_code=500,
            detail=f"Could not update recommendation preferences: {e}",
        ) from e


#TODO: IMPLEMENTAR FILTRO COLABORATIVO
#TODO: IMPLEMENTAR CON REDIS CACHE DE RECOMENDACIONES
def recommend_courses(
    db: Session, user_id: int, limit: int
) -> ListCourseRecommendationsSchema:
    profile = get_or_create_recommendation(db, user_id)
    excluded = _enrolled_course_ids(db, user_id)

    sites = _enum_values(profile.preferred_sites, Site)
    categories = _enum_values(profile.preferred_categories, Category)
    languages = _enum_values(profile.preferred_languages, Language)
    course_types = _enum_values(profile.preferred_course_types, CourseType)

    has_preferences = _has_any_preferences(sites, categories, languages, course_types)
    if not has_preferences:
        return ListCourseRecommendationsSchema(recommendations=[])

    query = db.query(CourseModel)
    if excluded:
        query = query.filter(CourseModel.id.notin_(excluded))
    courses = query.all()

    scored: List[tuple[int, float, int]] = []
    for course in courses:
        score = _score_course(course, sites, categories, languages, course_types)
        if score == 0:
            continue
        rating = float(course.rating) if course.rating is not None else 0.0
        scored.append((score, rating, course.id))

    scored.sort(key=lambda item: (-item[0], -item[1], item[2]))
    top = scored[:limit]

    if not top:
        return ListCourseRecommendationsSchema(recommendations=[])

    top_ids = [course_id for _, _, course_id in top]
    course_rows = db.query(CourseModel).filter(CourseModel.id.in_(top_ids)).all()
    course_by_id = {course.id: course for course in course_rows}

    recommendations: List[CourseRecommendationSchema] = []
    for score, rating, course_id in top:
        course = course_by_id.get(course_id)
        if course is None:
            continue
        recommendations.append(
            CourseRecommendationSchema(
                course=course,
                recommendation_percent=_recommendation_percent(score),
                source_type=RecommendationSourceType.PREFERENCES,
            )
        )

    return ListCourseRecommendationsSchema(recommendations=recommendations)
