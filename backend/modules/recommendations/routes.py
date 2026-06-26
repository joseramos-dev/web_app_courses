from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import require_role
from modules.auth.service import get_current_user
from modules.recommendations.schema import (
    ListCourseRecommendationsSchema,
    RecommendationSchema,
    RecommendationUpdateSchema,
)
from modules.recommendations.service import (
    get_or_create_recommendation,
    recommend_courses,
    update_preferences,
)


recommendations_router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
)


@recommendations_router.get(
    "/me",
    response_model=ListCourseRecommendationsSchema,
    status_code=status.HTTP_200_OK,
)
def get_my_recommendations(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["student", "admin"])),
    limit: int = Query(8, ge=1, le=50),
):
    return recommend_courses(db, _user.id, limit)


@recommendations_router.get(
    "/preferences",
    response_model=RecommendationSchema,
    status_code=status.HTTP_200_OK,
)
def get_my_preferences(
    db: Annotated[Session, Depends(get_db)],
    current_user=Depends(get_current_user),
):
    return get_or_create_recommendation(db, current_user.id)


@recommendations_router.patch(
    "/preferences",
    response_model=RecommendationSchema,
    status_code=status.HTTP_200_OK,
)
def patch_my_preferences(
    payload: RecommendationUpdateSchema,
    db: Annotated[Session, Depends(get_db)],
    current_user=Depends(get_current_user),
):
    row = update_preferences(db, current_user, payload)
    return row
