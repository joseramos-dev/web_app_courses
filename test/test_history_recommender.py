"""Recomendador por historial de completados y valoraciones de cursos similares.

    cd backend
    uv run pytest ../test/test_history_recommender.py -v
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
from modules.recommendations.schema import RecommendationSourceType
from modules.recommendations.service import recommend_courses_content_based

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


@pytest.fixture
def mock_db(mocker):
    db = mocker.Mock()
    query = mocker.Mock()
    query.filter.return_value = query
    query.join.return_value = query
    query.all.return_value = []
    db.query.return_value = query
    return db


def test_history_only_recommends_affined_course(mock_db, mocker):
    # Sin preferencias explícitas, solo debe recomendarse el curso candidato
    # que comparte site+category+language con el historial completado; el
    # candidato totalmente distinto queda fuera y la fuente debe ser HISTORY.
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

    mocker.patch(
        "modules.recommendations.service.get_or_create_recommendation",
        return_value=_empty_profile(),
    )
    mocker.patch(
        "modules.recommendations.service.enrolled_course_ids",
        return_value={101, 102},
    )
    mocker.patch(
        "modules.recommendations.service.fetch_completed_courses",
        return_value=completed,
    )
    mocker.patch(
        "modules.recommendations.service.fetch_completed_with_ratings",
        return_value=[],
    )
    mock_db.query.return_value.all.return_value = [
        candidate_affined,
        candidate_different,
    ]

    result = recommend_courses_content_based(mock_db, user_id=1, limit=5)
    ids = [rec.course.id for rec in result.recommendations]

    assert ids == [201]
    assert result.recommendations[0].source_type == RecommendationSourceType.HISTORY


def test_no_preferences_nor_completed_returns_empty(mock_db, mocker):
    # Un usuario sin preferencias guardadas ni cursos completados no tiene
    # base para el content-based, así que debe recibir una lista vacía.
    mocker.patch(
        "modules.recommendations.service.get_or_create_recommendation",
        return_value=_empty_profile(),
    )
    mocker.patch(
        "modules.recommendations.service.fetch_completed_courses",
        return_value=[],
    )

    result = recommend_courses_content_based(mock_db, user_id=99, limit=5)
    assert result.recommendations == []
