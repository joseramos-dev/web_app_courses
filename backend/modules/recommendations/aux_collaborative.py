import math
from collections import defaultdict
from typing import Dict, Set

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from modules.course_ratings.model import CourseRatingModel
from modules.courses.model import CourseModel
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus

PROGRESS_WEIGHT = 0.5
RATING_WEIGHT = 0.5
DEFAULT_RATING = 2.5
RATING_MAX = 5
MIN_ENROLLMENTS_FOR_COLLABORATIVE = 3
COLLABORATIVE_BLEND_WEIGHT = 0.5
PREFERENCE_BLEND_WEIGHT = 0.5

_ACTIVE_STATUSES = [EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.COMPLETED]

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


def build_weighted_enrollment_map(db: Session, user_id: int) -> UserCourseWeights:
    """Interaction weights for `user_id` and for the users who can influence
    their recommendations.

    Only users sharing at least one course with the target are loaded, which is
    equivalent to loading everyone rather than an approximation of it: two users
    with no course in common have disjoint weight vectors, so their dot product
    -- and therefore their cosine similarity -- is exactly 0, and
    `_score_collaborative_candidates` already discards every neighbour scoring
    <= 0. Everyone left out contributed nothing.

    Restricting the query is what lets this run per request: the previous
    version read the whole table and hid the cost behind a 10-minute
    process-global cache, which went stale on every new enrollment and gave
    different answers depending on which uvicorn worker served the request.
    """
    target_course_ids = select(EnrollmentModel.course_id).where(
        EnrollmentModel.user_id == user_id,
        EnrollmentModel.status.in_(_ACTIVE_STATUSES),
    )
    # Superset of the real neighbours: `is_public` is not applied here, so a
    # course the main query later filters out can still pull a user in. That is
    # harmless (their similarity comes out 0 anyway) and guarantees we never
    # drop a neighbour that would have counted.
    neighbour_ids = select(EnrollmentModel.user_id).where(
        EnrollmentModel.course_id.in_(target_course_ids),
        EnrollmentModel.status.in_(_ACTIVE_STATUSES),
    )

    rows = (
        db.query(
            EnrollmentModel.user_id,
            EnrollmentModel.course_id,
            EnrollmentModel.progress_percent,
            CourseRatingModel.score,
        )
        .join(
            CourseModel,
            CourseModel.id == EnrollmentModel.course_id,
        )
        .outerjoin(
            CourseRatingModel,
            and_(
                CourseRatingModel.user_id == EnrollmentModel.user_id,
                CourseRatingModel.course_id == EnrollmentModel.course_id,
            ),
        )
        .filter(
            EnrollmentModel.user_id.in_(neighbour_ids),
            EnrollmentModel.status.in_(_ACTIVE_STATUSES),
            CourseModel.is_public.is_(True),
        )
        .all()
    )

    enrollment_map: UserCourseWeights = defaultdict(dict)
    for row_user_id, course_id, progress_percent, rating_score in rows:
        enrollment_map[row_user_id][course_id] = course_interaction_weight(
            float(progress_percent), rating_score
        )
    return dict(enrollment_map)


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


def collaborative_course_scores(
    db: Session, user_id: int, excluded: Set[int] | None = None
) -> Dict[int, float]:
    """Normalized collaborative scores in [0, 1] for non-enrolled courses."""
    enrollment_map = build_weighted_enrollment_map(db, user_id)
    if not enrollment_map.get(user_id):
        return {}

    if excluded is None:
        from modules.recommendations.aux_content_based import enrolled_course_ids

        excluded = enrolled_course_ids(db, user_id)

    raw_scores = _score_collaborative_candidates(enrollment_map, user_id, excluded)
    if not raw_scores:
        return {}

    max_score = max(raw_scores.values())
    if max_score <= 0.0:
        return {}

    return {
        course_id: score / max_score
        for course_id, score in raw_scores.items()
    }
