"""Pruebas del recomendador colaborativo y enrutamiento entre estrategias.

    cd backend
    uv run pytest ../test/test_collaborative_recommender.py -v
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
from modules.recommendations.aux_collaborative import recommend_courses_collaborative
from modules.recommendations.schema import ListCourseRecommendationsSchema
from modules.recommendations.service import recommend_courses

NOW = datetime(2025, 1, 1, tzinfo=timezone.utc)


def _course(
    course_id: int,
    *,
    site=Site.COURSERA,
    category=Category.BUSINESS,
    language=Language.ENGLISH,
    course_type=CourseType.COURSE,
    rating: float = 4.0,
    difficulty: Difficulty = Difficulty.INTERMEDIATE,
):
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
        duration_seconds=3600,
        difficulty=difficulty,
        created_at=NOW,
        updated_at=NOW,
        instructor_id=None,
        instructor_name=None,
        lessons_count=0,
        ratings_count=0,
    )


WEIGHTED_MAP = {
    1: {1: 0.75, 2: 0.75, 3: 0.75},
    2: {2: 1.0, 4: 0.6},
    3: {1: 0.5, 4: 0.8},
}


@pytest.fixture
def courses():
    return [_course(i) for i in range(1, 5)]


@pytest.fixture
def mock_db(mocker, courses):
    db = mocker.Mock()
    query = mocker.Mock()
    query.filter.return_value = query
    query.all.return_value = courses
    db.query.return_value = query
    return db


def test_recommend_courses_collaborative_returns_collaborative_source(
    mock_db, mocker, courses
):
    # Con un mapa de interacciones ponderadas por usuario, el filtrado
    # colaborativo debe recomendar el curso 4 (el único no matriculado por
    # el usuario 1 pero sí por usuarios similares), etiquetado como fuente
    # "collaborative" y con el 100% de coincidencia.
    mocker.patch(
        "modules.recommendations.aux_collaborative.build_weighted_enrollment_map",
        return_value=WEIGHTED_MAP,
    )
    mocker.patch(
        "modules.recommendations.aux_collaborative.enrolled_course_ids",
        return_value={1, 2, 3},
    )

    result = recommend_courses_collaborative(mock_db, user_id=1, limit=10)

    assert len(result.recommendations) == 1
    rec = result.recommendations[0]
    assert rec.course.id == 4
    assert rec.source_type == "collaborative"
    assert rec.recommendation_percent == 100.0


def test_recommend_courses_routes_to_content_based_with_few_enrollments(mocker, mock_db):
    # Si el usuario tiene menos matrículas activas que el umbral mínimo
    # (MIN_ENROLLMENTS_FOR_COLLABORATIVE), el punto de entrada debe usar
    # directamente el content-based y no debe llamar al colaborativo.
    cb_result = ListCourseRecommendationsSchema(recommendations=[])
    mocker.patch(
        "modules.recommendations.service.count_active_enrollments",
        return_value=2,
    )
    content_based = mocker.patch(
        "modules.recommendations.service.recommend_courses_content_based",
        return_value=cb_result,
    )
    collaborative = mocker.patch(
        "modules.recommendations.service.recommend_courses_collaborative",
    )

    result = recommend_courses(mock_db, user_id=1, limit=10)

    assert result == cb_result
    content_based.assert_called_once_with(mock_db, 1, 10)
    collaborative.assert_not_called()
