"""Recomendador content-based: porcentajes de coincidencia con preferencias.

    cd backend
    uv run pytest ../test/test_content_recommender.py -v
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from modules.courses.model import Category, CourseType, Difficulty, Language, Site
from modules.recommendations.service import recommend_courses_content_based

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
        duration_seconds=duration_seconds,
        difficulty=difficulty,
        created_at=NOW,
        updated_at=NOW,
        instructor_id=None,
        instructor_name=None,
        lessons_count=0,
        ratings_count=0,
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


def test_recommendation_percentages(mock_db, mocker):
    # Comprueba que los porcentajes de recomendación coinciden con los
    # valores esperados para un perfil de preferencias y quedan entre 0% y 100%.
    profile = _profile(
        sites=[Site.COURSERA],
        categories=[Category.BUSINESS],
        languages=[Language.ENGLISH],
    )
    expected = {1: 71.3, 2: 71.3, 3: 71.3}

    mocker.patch(
        "modules.recommendations.service.get_or_create_recommendation",
        return_value=profile,
    )
    mocker.patch(
        "modules.recommendations.service.enrolled_course_ids",
        return_value=set(),
    )
    mocker.patch(
        "modules.recommendations.service.fetch_completed_courses",
        return_value=[],
    )
    mocker.patch(
        "modules.recommendations.service.fetch_completed_with_ratings",
        return_value=[],
    )

    result = recommend_courses_content_based(mock_db, user_id=1, limit=10)
    got = {rec.course.id: rec.recommendation_percent for rec in result.recommendations}

    assert got == expected

    for percent in got.values():
        assert 0 < percent < 100
