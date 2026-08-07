import enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from modules.courses.model import (
    Category,
    CourseType,
    Difficulty,
    DurationBucket,
    Language,
    Site,
)
from modules.courses.schema import CourseSchema


class RecommendationSourceType(str, enum.Enum):
    PREFERENCES = "preferences"
    COLLABORATIVE = "collaborative"
    HISTORY = "history"
    HYBRID = "hybrid"


class RecommendationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    preferred_sites: List[Site] = Field(default_factory=list)
    preferred_categories: List[Category] = Field(default_factory=list)
    preferred_languages: List[Language] = Field(default_factory=list)
    preferred_course_types: List[CourseType] = Field(default_factory=list)
    preferred_duration_buckets: List[DurationBucket] = Field(default_factory=list)
    preferred_difficulties: List[Difficulty] = Field(default_factory=list)


class RecommendationUpdateSchema(BaseModel):
    preferred_sites: Optional[List[Site]] = None
    preferred_categories: Optional[List[Category]] = None
    preferred_languages: Optional[List[Language]] = None
    preferred_course_types: Optional[List[CourseType]] = None
    preferred_duration_buckets: Optional[List[DurationBucket]] = None
    preferred_difficulties: Optional[List[Difficulty]] = None


class CourseRecommendationSchema(BaseModel):
    course: CourseSchema
    recommendation_percent: float
    source_type: RecommendationSourceType = RecommendationSourceType.PREFERENCES


class ListCourseRecommendationsSchema(BaseModel):
    recommendations: List[CourseRecommendationSchema]
