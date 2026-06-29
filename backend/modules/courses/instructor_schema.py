from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from modules.dashboard.schema import (
    EnrollmentCohortSchema,
    LessonAggregateSchema,
    ProgressBucketSchema,
)
from modules.enrollments.model import EnrollmentStatus
from modules.lessons.model import LessonType
from modules.progress.model import LessonProgressStatus


class InstructorStudentRowSchema(BaseModel):
    user_id: int
    student_name: str
    status: EnrollmentStatus
    progress_percent: float
    completed_lessons_count: int
    total_lessons: int
    enrolled_at: datetime
    last_activity_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class InstructorCourseStudentsSchema(BaseModel):
    course_id: int
    course_title: str
    total_lessons: int
    students_count: int
    completed_count: int
    avg_progress_percent: float
    completion_rate: float
    avg_rating: Optional[float] = None
    lesson_stats: List[LessonAggregateSchema]
    progress_buckets: List[ProgressBucketSchema]
    cohorts: List[EnrollmentCohortSchema]
    students: List[InstructorStudentRowSchema]


class InstructorLessonProgressRowSchema(BaseModel):
    lesson_id: int
    lesson_title: str
    lesson_type: LessonType
    position: int
    status: LessonProgressStatus
    best_score: Optional[float] = None
    attempts: int = 0
    completed_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None


class InstructorStudentDetailSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student: InstructorStudentRowSchema
    lesson_progress: List[InstructorLessonProgressRowSchema]
