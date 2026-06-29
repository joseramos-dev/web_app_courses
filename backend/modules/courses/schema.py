from pydantic import BaseModel, ConfigDict, Field, computed_field
from datetime import datetime
from modules.courses.model import Site, Category, Language, CourseType, Difficulty, DurationBucket
from modules.courses.duration_utils import duration_bucket as compute_duration_bucket
from typing import Optional, List

class CourseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    url: str
    site: Site
    category: Category
    language: Language
    course_type: CourseType
    subcategory: Optional[str] = None
    intro: Optional[str] = None
    rating: Optional[float] = None
    duration_seconds: Optional[int] = None
    difficulty: Difficulty
    created_at: datetime
    updated_at: datetime
    instructor_id: Optional[int] = None
    instructor_name: Optional[str] = None
    lessons_count: int = 0
    ratings_count: int = 0

    @computed_field
    @property
    def duration_bucket(self) -> Optional[DurationBucket]:
        return compute_duration_bucket(self.duration_seconds)


class CourseUpdateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: Optional[str] = None
    url: Optional[str] = None
    site: Optional[Site] = None
    category: Optional[Category] = None
    language: Optional[Language] = None
    course_type: Optional[CourseType] = None
    subcategory: Optional[str] = None
    intro: Optional[str] = None
    duration_seconds: Optional[int] = None
    difficulty: Optional[Difficulty] = None
    instructor_id: Optional[int] = None

class CourseCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str = Field(min_length=1)
    url: Optional[str] = None
    site: Site
    category: Category
    language: Language
    course_type: CourseType
    subcategory: Optional[str] = None
    intro: Optional[str] = None
    duration_seconds: Optional[int] = None
    difficulty: Difficulty = Difficulty.INTERMEDIATE
    instructor_id: Optional[int] = None

class CoursePaginatedSchema(BaseModel):
    courses: List[CourseSchema]
    total: int
    limit: int
    offset: int
