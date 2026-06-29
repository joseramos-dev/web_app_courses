"""Recomendador content-based: 4 cursos, 2 perfiles, porcentajes parciales.

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

from modules.courses.model import Category, CourseType, Difficulty, DurationBucket, Language, Site
from modules.recommendations.aux_content_based import preference_match_ratio
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


PROFILES = {
    1: _profile(
        sites=[Site.COURSERA],
        categories=[Category.BUSINESS],
        languages=[Language.ENGLISH],
    ),
    2: _profile(
        categories=[Category.DATA_SCIENCE],
        languages=[Language.ENGLISH],
        types=[CourseType.SPECIALIZATION],
    ),
}

EXPECTED = {
    1: {1: 71.3, 2: 71.3, 3: 71.3},
    2: {1: 71.3, 3: 49.7, 4: 49.7},
}


def _patch_content_based_deps(mocker, profile):
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


@pytest.mark.parametrize("user_id", [1, 2])
def test_recommendation_percentages(mock_db, mocker, user_id):
    _patch_content_based_deps(mocker, PROFILES[user_id])

    result = recommend_courses_content_based(mock_db, user_id=user_id, limit=10)
    got = {rec.course.id: rec.recommendation_percent for rec in result.recommendations}

    assert got == EXPECTED[user_id]

    for percent in got.values():
        assert 0 < percent < 100


def test_duration_bucket_preference_excludes_null_duration():
    course = _course(
        99,
        site=Site.COURSERA,
        category=Category.BUSINESS,
        language=Language.ENGLISH,
        course_type=CourseType.COURSE,
        duration_seconds=None,
    )
    ratio = preference_match_ratio(
        course,
        set(),
        set(),
        set(),
        set(),
        {DurationBucket.SHORT},
        set(),
    )
    assert ratio == 0.0


def test_duration_and_difficulty_preferences(mock_db, mocker, courses):
    profile = _profile(
        duration_buckets=[DurationBucket.SHORT],
        difficulties=[Difficulty.BEGINNER],
    )
    _patch_content_based_deps(mocker, profile)

    beginner_short = _course(
        10,
        site=Site.COURSERA,
        category=Category.BUSINESS,
        language=Language.ENGLISH,
        course_type=CourseType.COURSE,
        duration_seconds=7200,
        difficulty=Difficulty.BEGINNER,
    )
    mock_db.query.return_value.all.return_value = courses + [beginner_short]

    result = recommend_courses_content_based(mock_db, user_id=99, limit=10)
    got = {rec.course.id: rec.recommendation_percent for rec in result.recommendations}

    assert got[10] == 93.0
    for course_id, percent in got.items():
        if course_id != 10:
            assert percent < got[10]
