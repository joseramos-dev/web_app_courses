import math
from collections import defaultdict
from typing import Dict, List, Set

from sqlalchemy import and_
from sqlalchemy.orm import Session

from modules.course_ratings.model import CourseRatingModel
from modules.courses.model import CourseModel
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.recommendations.aux_content_based import (
    ScoredEntry,
    build_recommendations,
    enrolled_course_ids,
)
from modules.recommendations.schema import (
    ListCourseRecommendationsSchema,
    RecommendationSourceType,
)

PROGRESS_WEIGHT = 0.5
RATING_WEIGHT = 0.5
DEFAULT_RATING = 2.5
RATING_MAX = 5
MIN_ENROLLMENTS_FOR_COLLABORATIVE = 3

UserCourseWeights = Dict[int, Dict[int, float]]


def course_interaction_weight(
    progress_percent: float, rating_score: int | None
) -> float:
    progress_component = progress_percent / 100.0
    rating = rating_score if rating_score is not None else DEFAULT_RATING
    rating_component = rating / RATING_MAX
    return PROGRESS_WEIGHT * progress_component + RATING_WEIGHT * rating_component


def cosine_similarity(
    vec_a: Dict[int, float], vec_b: Dict[int, float]
) -> float:
    if not vec_a or not vec_b:
        return 0.0

    keys = set(vec_a) | set(vec_b)
    dot = sum(vec_a.get(key, 0.0) * vec_b.get(key, 0.0) for key in keys)
    norm_a = math.sqrt(sum(value * value for value in vec_a.values()))
    norm_b = math.sqrt(sum(value * value for value in vec_b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def build_weighted_enrollment_map(db: Session) -> UserCourseWeights:
    rows = (
        db.query(
            EnrollmentModel.user_id,
            EnrollmentModel.course_id,
            EnrollmentModel.progress_percent,
            CourseRatingModel.score,
        )
        .outerjoin(
            CourseRatingModel,
            and_(
                CourseRatingModel.user_id == EnrollmentModel.user_id,
                CourseRatingModel.course_id == EnrollmentModel.course_id,
            ),
        )
        .filter(
            EnrollmentModel.status.in_(
                [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.COMPLETED]
            )
        )
        .all()
    )

    enrollment_map: UserCourseWeights = defaultdict(dict)
    for user_id, course_id, progress_percent, rating_score in rows:
        enrollment_map[user_id][course_id] = course_interaction_weight(
            float(progress_percent), rating_score
        )
    return dict(enrollment_map)


def count_active_enrollments(db: Session, user_id: int) -> int:
    return (
        db.query(EnrollmentModel.id)
        .filter(
            EnrollmentModel.user_id == user_id,
            EnrollmentModel.status.in_(
                [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.COMPLETED]
            ),
        )
        .count()
    )


def _score_collaborative_candidates(
    enrollment_map: UserCourseWeights,
    user_id: int,
    excluded: Set[int],
) -> Dict[int, float]:
    target_vec = enrollment_map.get(user_id, {})
    if not target_vec:
        return {}

    course_scores: Dict[int, float] = defaultdict(float)
    for other_id, other_vec in enrollment_map.items():
        if other_id == user_id:
            continue
        sim = cosine_similarity(target_vec, other_vec)
        if sim <= 0.0:
            continue
        for course_id, weight in other_vec.items():
            if course_id in excluded:
                continue
            course_scores[course_id] += sim * weight

    return dict(course_scores)


def recommend_courses_collaborative(
    db: Session, user_id: int, limit: int
) -> ListCourseRecommendationsSchema:
    enrollment_map = build_weighted_enrollment_map(db)
    target_vec = enrollment_map.get(user_id, {})
    if not target_vec:
        return ListCourseRecommendationsSchema(recommendations=[])

    excluded = enrolled_course_ids(db, user_id)
    course_scores = _score_collaborative_candidates(
        enrollment_map, user_id, excluded
    )
    if not course_scores:
        return ListCourseRecommendationsSchema(recommendations=[])

    max_score = max(course_scores.values())
    if max_score <= 0.0:
        return ListCourseRecommendationsSchema(recommendations=[])

    course_ids = list(course_scores.keys())
    course_rows = db.query(CourseModel).filter(CourseModel.id.in_(course_ids)).all()
    course_by_id = {course.id: course for course in course_rows}

    scored: List[ScoredEntry] = []
    for course_id, score in course_scores.items():
        course = course_by_id.get(course_id)
        if course is None:
            continue
        ratio = score / max_score
        rating = float(course.rating) if course.rating is not None else 0.0
        scored.append((ratio, rating, course_id))

    if not scored:
        return ListCourseRecommendationsSchema(recommendations=[])

    scored.sort(key=lambda item: (-item[0], -item[1], item[2]))
    top = scored[:limit]

    recommendations = build_recommendations(
        db, top, RecommendationSourceType.COLLABORATIVE
    )
    return ListCourseRecommendationsSchema(recommendations=recommendations)
