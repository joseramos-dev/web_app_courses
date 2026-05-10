from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from modules.enrollments.model import EnrollmentStatus
from modules.progress.model import LessonProgressStatus


class LessonProgressSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enrollment_id: int
    lesson_id: int
    status: LessonProgressStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    watched_seconds: int
    best_score: Optional[float] = None
    attempts: int


class EnrollmentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    course_id: int
    status: EnrollmentStatus
    enrolled_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    progress_percent: float
    completed_lessons_count: int


class EnrollmentDetailSchema(EnrollmentSchema):
    """Same as EnrollmentSchema but includes per-lesson progress.

    Used by `GET /enrollments/me/course/{course_id}` to power the
    enrollment-aware CourseDetail view.
    """

    lesson_progress: List[LessonProgressSchema] = []
