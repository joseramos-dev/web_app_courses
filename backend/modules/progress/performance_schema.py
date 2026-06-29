from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class LessonAttemptSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    score: float
    passed: bool
    attempted_at: datetime


class LessonAttemptListSchema(BaseModel):
    attempts: List[LessonAttemptSchema]
    best_score: Optional[float] = None
    total_attempts: int


class RecentAttemptSchema(BaseModel):
    id: int
    course_id: int
    course_title: str
    lesson_id: int
    lesson_title: str
    score: float
    passed: bool
    attempted_at: datetime


class CoursePerformanceRowSchema(BaseModel):
    course_id: int
    course_title: str
    user_avg_score: Optional[float] = None
    cohort_avg_score: Optional[float] = None
    total_attempts: int
    tests_with_attempts: int


class StudentPerformanceSchema(BaseModel):
    overall_avg_score: Optional[float] = None
    total_attempts: int
    courses: List[CoursePerformanceRowSchema]
    recent_attempts: List[RecentAttemptSchema]
