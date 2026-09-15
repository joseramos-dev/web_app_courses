"""Recomendador content-based: porcentajes de coincidencia con preferencias.

    cd backend
    uv run pytest ../test/recommender/test_content_recommender.py -v
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from modules.courses.model import Category, CourseType, Difficulty, Language, Site
from modules.recommendations.aux_content_based import ScoringCourse
from modules.recommendations.aux_history_based import HistoryProfile
from modules.recommendations.service import RecommendationContext, recommend_courses_content_based

NOW = datetime(2025, 1, 1, tzinfo=timezone.utc)


def _course(
    course_id: int,
    *,
    site: Site,
    category: Category,
    language: Language,
    course_type: CourseType,
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
def courses():
    return [
        _course(
            1,
            site=Site.COURSERA,
            category=Category.DATA_SCIENCE,
            language=Language.ENGLISH,
            course_type=CourseType.COURSE,
        ),
        _course(
            2,
            site=Site.COURSERA,
            category=Category.BUSINESS,
            language=Language.SPANISH,
            course_type=CourseType.COURSE,
        ),
        _course(
            3,
            site=Site.UDACTITY,
            category=Category.BUSINESS,
            language=Language.ENGLISH,
            course_type=CourseType.COURSE,
        ),
        _course(
            4,
            site=Site.FUTURE_LEARN,
            category=Category.COMPUTER_SCIENCE,
            language=Language.FRENCH,
            course_type=CourseType.SPECIALIZATION,
        ),
    ]


@pytest.fixture
def mock_db(mocker, courses):
    db = mocker.Mock()
    query = mocker.Mock()
    query.filter.return_value = query
    query.options.return_value = query
    query.all.return_value = courses
    db.query.return_value = query
    return db


def _profile(**prefs):
    return SimpleNamespace(
        preferred_sites=[s.value for s in prefs.get("sites", [])],
        preferred_categories=[c.value for c in prefs.get("categories", [])],
        preferred_languages=[l.value for l in prefs.get("languages", [])],
        preferred_course_types=[t.value for t in prefs.get("types", [])],
        preferred_duration_buckets=[
            b.value for b in prefs.get("duration_buckets", [])
        ],
        preferred_difficulties=[d.value for d in prefs.get("difficulties", [])],
    )


def test_recommendation_percentages(mock_db, mocker, courses):
    profile = _profile(
        sites=[Site.COURSERA],
        categories=[Category.BUSINESS],
        languages=[Language.ENGLISH],
    )
    expected = {1: 66.7, 2: 66.7, 3: 66.7}

    ctx = RecommendationContext(
        user_id=1,
        profile=profile,
        sites={Site.COURSERA},
        categories={Category.BUSINESS},
        languages={Language.ENGLISH},
        course_types=set(),
        duration_buckets=set(),
        difficulties=set(),
        enrolled_ids=set(),
        completed_courses=[],
        history_profile=HistoryProfile(),
        active_enrollment_count=0,
    )

    mocker.patch(
        "modules.recommendations.service.fetch_candidate_courses_light",
        return_value=[_to_scoring(c) for c in courses],
    )

    result = recommend_courses_content_based(mock_db, ctx, 10)
    got = {rec.course.id: rec.recommendation_percent for rec in result.recommendations}

    assert got == expected

    for percent in got.values():
        assert 0 < percent < 100


def test_exclude_current_recommendations_on_refresh(mock_db, mocker, courses):
    profile = _profile(
        sites=[Site.COURSERA],
        categories=[Category.BUSINESS],
        languages=[Language.ENGLISH],
    )
    ctx = RecommendationContext(
        user_id=1,
        profile=profile,
        sites={Site.COURSERA},
        categories={Category.BUSINESS},
        languages={Language.ENGLISH},
        course_types=set(),
        duration_buckets=set(),
        difficulties=set(),
        enrolled_ids=set(),
        completed_courses=[],
        history_profile=HistoryProfile(),
        active_enrollment_count=0,
    )

    def fetch_side_effect(_db, excluded, *_args, **_kwargs):
        return [_to_scoring(c) for c in courses if c.id not in excluded]

    mocker.patch(
        "modules.recommendations.service.fetch_candidate_courses_light",
        side_effect=fetch_side_effect,
    )

    first = recommend_courses_content_based(mock_db, ctx, 10)
    first_ids = {rec.course.id for rec in first.recommendations}

    second = recommend_courses_content_based(
        mock_db, ctx, 10, exclude=first_ids
    )
    second_ids = {rec.course.id for rec in second.recommendations}

    assert first_ids
    assert second_ids.isdisjoint(first_ids)
