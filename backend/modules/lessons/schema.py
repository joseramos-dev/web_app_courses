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
    create_at: datetime
    update_at: datetime


class LessonCreateSchema(BaseModel):
    title: str
    lesson_type: LessonType
    position: int
    body: Optional[str] = None
    video_url: Optional[str] = None


class LessonUpdateSchema(BaseModel):
    title: Optional[str] = None
    lesson_type: Optional[LessonType] = None
    position: Optional[int] = None
    body: Optional[str] = None
    video_url: Optional[str] = None


class LessonsReorderSchema(BaseModel):
    ordered_lesson_ids: List[int]


# ---------- Lesson completion (test answers) ----------

class LessonAnswerSchema(BaseModel):
    question_id: int
    selected_option_ids: List[int]


class LessonAnswerSubmitSchema(BaseModel):
    answers: List[LessonAnswerSchema] = []
