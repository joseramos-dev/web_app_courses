import enum
from sqlalchemy.sql import func

from sqlalchemy.orm import relationship
from core.database import Base
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    String,
    Integer,
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
    ASSIGNMENT = "assignment"


class LessonModel(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(
        Integer,
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id = Column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String, nullable=False)
    lesson_type = Column(SqlEnum(LessonType), nullable=False)
    position = Column(Integer, nullable=False)
    body = Column(Text, nullable=True)  # markdown for TEXT / ASSIGNMENT instructions
    video_url = Column(String, nullable=True)  # for LessonType.VIDEO
    # Declared by whoever writes the lesson. Topic and course durations are the
    # sum of these, so this is the single place a duration is entered.
    # Nullable: a lesson without a declared duration simply adds 0.
    duration_seconds = Column(Integer, nullable=True)
    max_score = Column(
        Float, nullable=True, default=100.0, server_default="100"
    )  # ASSIGNMENT
    passing_score = Column(
        Float, nullable=True, default=70.0, server_default="70"
    )  # ASSIGNMENT
    allows_file_submission = Column(
        Boolean, nullable=True, default=True, server_default="true"
    )  # ASSIGNMENT
    create_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    update_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    course = relationship("CourseModel", back_populates="lessons")
    topic = relationship("TopicModel", back_populates="lessons")
    questions = relationship(
        "QuestionModel",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="QuestionModel.position",
    )
    files = relationship(
        "LessonFileModel",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonFileModel.uploaded_at",
    )
    __table_args__ = (
        UniqueConstraint("topic_id", "position", name="uq_topic_lesson_position"),
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


class LessonFileModel(Base):
    __tablename__ = "lesson_files"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename = Column(String, nullable=False)
    storage_name = Column(String, nullable=False, unique=True)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    # False: material published by the course staff, visible to every enrolled
    # student. True: a student's assignment upload, private to its author and
    # the course staff.
    is_submission = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    uploaded_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    lesson = relationship("LessonModel", back_populates="files")
    uploader = relationship("UserModel")
