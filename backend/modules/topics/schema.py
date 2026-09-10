from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator
from typing import List, Optional

from modules.lessons.model import LessonType
from modules.lessons.schema import LessonSchema


class TopicSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    name: str
    position: int


class TopicCreateSchema(BaseModel):
    name: str = Field(min_length=1)
    position: Optional[int] = None


class TopicUpdateSchema(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    position: Optional[int] = None


class TopicsReorderSchema(BaseModel):
    ordered_topic_ids: List[int]


class TopicWithLessonsSchema(TopicSchema):
    lessons: List[LessonSchema] = []

    @computed_field
    @property
    def duration_seconds(self) -> Optional[int]:
        """Sum of the topic's lesson durations.

        Computed rather than stored: the lessons are already loaded here, so it
        is free and cannot drift out of sync with them. `None` when no lesson
        declares a duration, matching how the course-level field behaves.
        """
        total = sum(lesson.duration_seconds or 0 for lesson in self.lessons)
        return total or None


class CourseCurriculumSchema(BaseModel):
    topics: List[TopicWithLessonsSchema] = []


class LessonsReorderInTopicSchema(BaseModel):
    ordered_lesson_ids: List[int]


# ---------- Curriculum import ----------
# One shared format for the admin endpoint and the demo seeder, so the JSON
# contract is defined once. Validation is strict on purpose: a malformed file
# must fail loudly instead of quietly seeding broken lessons.


class ImportAnswerOptionSchema(BaseModel):
    text: str = Field(min_length=1)
    is_correct: bool = False


class ImportQuestionSchema(BaseModel):
    prompt: str = Field(min_length=1)
    options: List[ImportAnswerOptionSchema] = Field(min_length=2)


class ImportLessonSchema(BaseModel):
    title: str = Field(min_length=1)
    lesson_type: LessonType
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    body: Optional[str] = None
    video_url: Optional[str] = None
    questions: List[ImportQuestionSchema] = []

    @model_validator(mode="after")
    def _check_shape(self) -> "ImportLessonSchema":
        if self.lesson_type == LessonType.ASSIGNMENT:
            # Assignments need an instructor to grade them, so a course seeded
            # with one can never be completed by a student on their own.
            raise ValueError("assignment lessons are not supported by the importer")

        quiz = self.lesson_type in (LessonType.TEST, LessonType.MULTIPLE_SELECTION)
        if quiz and not self.questions:
            raise ValueError(f"{self.lesson_type.value} lessons need at least one question")
        if not quiz and self.questions:
            raise ValueError(f"{self.lesson_type.value} lessons cannot carry questions")

        if self.lesson_type == LessonType.TEXT and not (self.body or "").strip():
            raise ValueError("text lessons need a body")
        if self.lesson_type == LessonType.VIDEO and not (self.video_url or "").strip():
            raise ValueError("video lessons need a video_url")

        for question in self.questions:
            correct = sum(1 for option in question.options if option.is_correct)
            if self.lesson_type == LessonType.TEST and correct != 1:
                raise ValueError(
                    f"test question '{question.prompt[:40]}' needs exactly one correct option"
                )
            if self.lesson_type == LessonType.MULTIPLE_SELECTION and correct < 2:
                raise ValueError(
                    f"multiple_selection question '{question.prompt[:40]}' needs two or more"
                )
        return self


class ImportTopicSchema(BaseModel):
    name: str = Field(min_length=1)
    lessons: List[ImportLessonSchema] = Field(min_length=1)


class CurriculumImportSchema(BaseModel):
    """Topics and lessons to add to a course."""

    topics: List[ImportTopicSchema] = Field(min_length=1)
    replace_existing: bool = Field(
        default=False,
        description=(
            "Destructive: deleting the current topics cascades into their lessons "
            "and the enrolled students' progress. Defaults to appending."
        ),
    )


class CurriculumImportResultSchema(BaseModel):
    topics_created: int
    lessons_created: int
    questions_created: int
    course_duration_seconds: Optional[int] = None
