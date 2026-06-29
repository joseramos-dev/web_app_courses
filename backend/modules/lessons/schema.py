from datetime import datetime
from pydantic import BaseModel, ConfigDict
from modules.lessons.model import LessonType
from typing import Optional, List


# ---------- Answer options ----------

class AnswerOptionPublicSchema(BaseModel):
    """Option exposed to students taking the lesson; never reveals is_correct."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    text: str
    position: int


class AnswerOptionAdminSchema(BaseModel):
    """Option exposed to admins/instructors editing the lesson."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    text: str
    is_correct: bool
    position: int


class AnswerOptionCreateSchema(BaseModel):
    text: str
    is_correct: bool = False
    position: int


# ---------- Questions ----------

class QuestionPublicSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    prompt: str
    position: int
    options: List[AnswerOptionPublicSchema] = []


class QuestionAdminSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    prompt: str
    position: int
    options: List[AnswerOptionAdminSchema] = []


class QuestionCreateSchema(BaseModel):
    prompt: str
    position: int
    options: List[AnswerOptionCreateSchema] = []


class QuestionUpdateSchema(BaseModel):
    prompt: Optional[str] = None
    position: Optional[int] = None
    options: Optional[List[AnswerOptionCreateSchema]] = None  # full replacement when present


# ---------- Lessons ----------

class LessonSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    lesson_type: LessonType
    position: int
    body: Optional[str] = None
    video_url: Optional[str] = None
    max_score: Optional[float] = None
    passing_score: Optional[float] = None
    allows_file_submission: Optional[bool] = None
    create_at: datetime
    update_at: datetime


class LessonCreateSchema(BaseModel):
    title: str
    lesson_type: LessonType
    position: int
    body: Optional[str] = None
    video_url: Optional[str] = None
    max_score: Optional[float] = 100.0
    passing_score: Optional[float] = 70.0
    allows_file_submission: Optional[bool] = True


class LessonUpdateSchema(BaseModel):
    title: Optional[str] = None
    lesson_type: Optional[LessonType] = None
    position: Optional[int] = None
    body: Optional[str] = None
    video_url: Optional[str] = None
    max_score: Optional[float] = None
    passing_score: Optional[float] = None
    allows_file_submission: Optional[bool] = None


class LessonsReorderSchema(BaseModel):
    ordered_lesson_ids: List[int]


# ---------- Lesson completion (test answers) ----------

class LessonAnswerSchema(BaseModel):
    question_id: int
    selected_option_ids: List[int]


class LessonAnswerSubmitSchema(BaseModel):
    answers: List[LessonAnswerSchema] = []


# ---------- Lesson files ----------

class LessonFileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    original_filename: str
    mime_type: str
    size_bytes: int
    uploaded_by: int
    uploaded_at: datetime
