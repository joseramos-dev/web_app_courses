"""Recomendador por historial de completados y valoraciones de cursos similares.

    cd backend
    uv run pytest ../test/recommender/test_history_recommender.py -v
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from modules.courses.model import Category, CourseType, Difficulty, Language, Site
from modules.recommendations.aux_content_based import ScoringCourse
from modules.recommendations.aux_history_based import HistoryProfile, build_history_profile
from modules.recommendations.schema import RecommendationSourceType
from modules.recommendations.service import RecommendationContext, recommend_courses_content_based

NOW = datetime(2025, 1, 1, tzinfo=timezone.utc)


def _course(
    course_id: int,
    *,
    site: Site,
    category: Category,
    language: Language,
    course_type: CourseType = CourseType.COURSE,
    rating: float = 4.0,
    duration_seconds: int | None = 3600,
    difficulty: Difficulty = Difficulty.INTERMEDIATE,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=course_id,
        title=f"Course {course_id}",
        url=f"https://example.com/{course_id}",
        site=site,
        category=category,
        language=language,
        course_type=course_type,
        subcategory=None,
        intro=None,
        rating=rating,
        avg_rating=rating,
        duration_seconds=duration_seconds,
        difficulty=difficulty,
        created_at=NOW,
        updated_at=NOW,
        instructor_id=None,
        instructor_name=None,
        lessons_count=0,
        ratings_count=0,
    )


def _empty_profile():
    return SimpleNamespace(
        preferred_sites=[],
        preferred_categories=[],
        preferred_languages=[],
        preferred_course_types=[],
        preferred_duration_buckets=[],
        preferred_difficulties=[],
    )


def _to_scoring(course) -> ScoringCourse:
    return ScoringCourse(
        id=course.id,
        site=course.site,
        category=course.category,
        language=course.language,
        course_type=course.course_type,
        duration_seconds=course.duration_seconds,
        difficulty=course.difficulty,
        avg_rating=course.rating,
    )


@pytest.fixture
def mock_db(mocker):
    db = mocker.Mock()
    query = mocker.Mock()
    query.filter.return_value = query
    query.options.return_value = query
    query.join.return_value = query
    query.all.return_value = []
    db.query.return_value = query
    return db


def test_history_only_recommends_affined_course(mock_db, mocker):
    completed = [
        _course(
            101,
            site=Site.COURSERA,
            category=Category.DATA_SCIENCE,
            language=Language.ENGLISH,
        ),
        _course(
            102,
            site=Site.COURSERA,
            category=Category.DATA_SCIENCE,
            language=Language.ENGLISH,
        ),
    ]
    candidate_affined = _course(
        201,
        site=Site.COURSERA,
        category=Category.DATA_SCIENCE,
        language=Language.SPANISH,
    )
    candidate_different = _course(
        202,
        site=Site.UDACTITY,
        category=Category.BUSINESS,
        language=Language.FRENCH,
        course_type=CourseType.SPECIALIZATION,
        difficulty=Difficulty.ADVANCED,
        duration_seconds=8 * 24 * 3600,
    )

    ctx = RecommendationContext(
        user_id=1,
        profile=_empty_profile(),
        sites=set(),
        categories=set(),
        languages=set(),
        course_types=set(),
        duration_buckets=set(),
        difficulties=set(),
        enrolled_ids={101, 102},
        completed_courses=completed,
        history_profile=build_history_profile(completed),
        active_enrollment_count=2,
    )

    mocker.patch(
        "modules.recommendations.service.fetch_candidate_courses_light",
        return_value=[_to_scoring(candidate_affined), _to_scoring(candidate_different)],
    )
    mock_db.query.return_value.all.return_value = [
        candidate_affined,
        candidate_different,
    ]

    result = recommend_courses_content_based(mock_db, ctx, 5)
    ids = [rec.course.id for rec in result.recommendations]

    assert ids == [201]
    assert result.recommendations[0].source_type == RecommendationSourceType.HISTORY


def test_no_preferences_nor_completed_returns_empty(mock_db, mocker):
    ctx = RecommendationContext(
        user_id=99,
        profile=_empty_profile(),
        sites=set(),
        categories=set(),
        languages=set(),
        course_types=set(),
        duration_buckets=set(),
        difficulties=set(),
        enrolled_ids=set(),
        completed_courses=[],
        history_profile=HistoryProfile(),
        active_enrollment_count=0,
    )

    result = recommend_courses_content_based(mock_db, ctx, 5)
    assert result.recommendations == []
