from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from modules.progress.model import SubmissionStatus


class AssignmentSubmitSchema(BaseModel):
    body: Optional[str] = None
    file_id: Optional[int] = None


class SubmissionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enrollment_id: int
    lesson_id: int
    body: Optional[str] = None
    file_id: Optional[int] = None
    status: SubmissionStatus
    score: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: datetime
    graded_at: Optional[datetime] = None
    graded_by: Optional[int] = None


class InstructorSubmissionRowSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    lesson_title: str
    student_user_id: int
    student_name: str
    body: Optional[str] = None
    file_id: Optional[int] = None
    status: SubmissionStatus
    score: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: datetime
    graded_at: Optional[datetime] = None


class SubmissionListSchema(BaseModel):
    submissions: List[InstructorSubmissionRowSchema] = Field(default_factory=list)


class GradeSubmissionSchema(BaseModel):
    score: float = Field(ge=0)
    feedback: Optional[str] = None
    returned: bool = False


class GradeSubmissionResultSchema(BaseModel):
    submission: SubmissionSchema
    lesson_completed: bool
