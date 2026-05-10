from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

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


class LessonCompleteResultSchema(BaseModel):
    """Returned by `POST /progress/lesson/{lesson_id}/complete`."""

    passed: bool
    score: Optional[float] = None  # 0-100, only for TEST / MULTIPLE_SELECTION
    lesson_progress: LessonProgressSchema
    enrollment_progress_percent: float
    enrollment_completed: bool
