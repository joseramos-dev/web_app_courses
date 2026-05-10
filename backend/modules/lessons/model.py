from datetime import datetime, timezone
import enum
from sqlalchemy.sql import func

from sqlalchemy.orm import relationship
from core.database import Base
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Integer,
    String,
    Column,
    Enum as SqlEnum,
    Text,
    UniqueConstraint,
)


class LessonType(str, enum.Enum):
    TEXT = "text"
    VIDEO = "video"
    TEST = "test"
    MULTIPLE_SELECTION = "multiple_selection"


class LessonModel(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String, nullable=False)
    lesson_type = Column(SqlEnum(LessonType), nullable=False)
    position = Column(Integer, nullable=False)
    body = Column(Text, nullable=True)  # markdown for LessonType.TEXT
    video_url = Column(String, nullable=True)  # for LessonType.VIDEO
    create_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    update_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    course = relationship("CourseModel", back_populates="lessons")
    questions = relationship(
        "QuestionModel",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="QuestionModel.position",
    )
    __table_args__ = (
        UniqueConstraint("course_id", "position", name="uq_course_position"),
    )


class QuestionModel(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt = Column(Text, nullable=False)
    position = Column(Integer, nullable=False)

    lesson = relationship("LessonModel", back_populates="questions")
    options = relationship(
        "AnswerOptionModel",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="AnswerOptionModel.position",
    )

    __table_args__ = (
        UniqueConstraint("lesson_id", "position", name="uq_question_position"),
    )


class AnswerOptionModel(Base):
    __tablename__ = "answer_options"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False, server_default="false")
    position = Column(Integer, nullable=False)

    question = relationship("QuestionModel", back_populates="options")

    __table_args__ = (
        UniqueConstraint("question_id", "position", name="uq_option_position"),
    )
