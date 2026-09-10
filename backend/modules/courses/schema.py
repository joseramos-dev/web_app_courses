from pydantic import BaseModel, ConfigDict, Field, computed_field
from datetime import datetime
from modules.courses.model import Site, Category, Language, CourseType, Difficulty, DurationBucket, LessonAccessMode
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
    intro_video_url: Optional[str] = None
    is_public: bool = True
    lesson_access_mode: LessonAccessMode = LessonAccessMode.OPEN
    rating: Optional[float] = None
    # Read-only: derived from the sum of the course's lesson durations.
    duration_seconds: Optional[int] = None
    difficulty: Difficulty
    created_at: datetime
    updated_at: datetime
    instructor_id: Optional[int] = None
    instructor_name: Optional[str] = None
    lessons_count: int = 0
    ratings_count: int = 0
    topics_count: int = 0
    instructor_courses_count: int = 0

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
    intro_video_url: Optional[str] = None
    is_public: Optional[bool] = None
    lesson_access_mode: Optional[LessonAccessMode] = None
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
    intro_video_url: Optional[str] = None
    is_public: bool = True
    lesson_access_mode: LessonAccessMode = LessonAccessMode.OPEN
    difficulty: Difficulty = Difficulty.INTERMEDIATE
    instructor_id: Optional[int] = None


class CourseEditStatsSchema(BaseModel):
    enrollments_count: int
    topics_count: int
    lessons_count: int
    duration_seconds: Optional[int] = None


class CoursePaginatedSchema(BaseModel):
    courses: List[CourseSchema]
    total: int
    limit: int
    offset: int
