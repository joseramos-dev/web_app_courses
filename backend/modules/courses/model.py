import enum

from sqlalchemy.sql import func

from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import column_property, relationship
from core.database import Base
from sqlalchemy import (
    Column,
    Float,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    Enum as SqlEnum,
    select,
)


# Site
# Coursera        2819
# Future Learn    2031
# Udacity          277
# Simplilearn      146
class Site(str, enum.Enum):
    COURSERA = "Coursera"
    FUTURE_LEARN = "Future Learn"
    UDACTITY = "Udacity"
    SIMPLILEARN = "Simplilearn"
    ACADEMY = "Academy"


# Category
# Non defined                         2454
# business                             897
# computer science                     457
# data science                         450
# health                               264
# information technology               222
# physical science and engineering     150
# arts and humanities                  120
# language learning                     86
# social sciences                       83
# personal development                  68
# math and logic                        22
class Category(str, enum.Enum):
    NON_DEFINED = "Non defined"
    BUSINESS = "business"
    COMPUTER_SCIENCE = "computer science"
    DATA_SCIENCE = "data science"
    HEALTH = "health"
    INFORMATION_TECHNOLOGY = "information technology"
    PHYSICAL_SCIENCE_AND_ENGINEERING = "physical science and engineering"
    ARTS_AND_HUMANITIES = "arts and humanities"
    LANGUAGE_LEARNING = "language learning"
    SOCIAL_SCIENCES = "social sciences"
    PERSONAL_DEVELOPMENT = "personal development"
    MATH_AND_LOGIC = "math and logic"


# Language
# English                   2726
# Non defined               2454
# Spanish                     58
# French                      11
# Japanese                     8
# Portuguese (Brazilian)       5
# Chinese (Simplified)         5
# German                       3
# Arabic                       1
# Indonesian                   1
# Russian                      1
class Language(str, enum.Enum):
    ENGLISH = "English"
    NON_DEFINED = "Non defined"
    SPANISH = "Spanish"
    FRENCH = "French"
    JAPANESE = "Japanese"
    PORTUGUESE = "Portuguese (Brazilian)"
    CHINESE = "Chinese (Simplified)"
    GERMAN = "German"
    ARABIC = "Arabic"
    INDONESIAN = "Indonesian"
    RUSSIAN = "Russian"


# Course Type
# Specialization
# Professional Certificate
# Course
# Project
# Non defined
class CourseType(str, enum.Enum):
    SPECIALIZATION = "Specialization"
    PROFESSIONAL_CERTIFICATE = "Professional Certificate"
    COURSE = "Course"
    PROJECT = "Project"
    NON_DEFINED = "Non defined"


class DurationBucket(str, enum.Enum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class Difficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class LessonAccessMode(str, enum.Enum):
    OPEN = "open"
    PROGRESSIVE = "progressive"


class CourseModel(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    url = Column(String, nullable=False)
    site = Column(SqlEnum(Site), nullable=False)
    category = Column(SqlEnum(Category), nullable=False)
    language = Column(SqlEnum(Language), nullable=False)
    course_type = Column(SqlEnum(CourseType), nullable=False)
    subcategory = Column(String, nullable=True)
    intro = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    difficulty = Column(
        SqlEnum(
            Difficulty,
            values_callable=lambda obj: [e.value for e in obj],
            name="difficulty",
        ),
        nullable=False,
        server_default=Difficulty.INTERMEDIATE.value,
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    instructor_id = Column(
        # SET NULL, not the default NO ACTION: deleting an account must not be
        # blocked by the courses it authored, and the catalogue already holds
        # ownerless courses (every imported one).
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_public = Column(Boolean, nullable=False, default=True, server_default="true")
    intro_video_url = Column(String, nullable=True)
    lesson_access_mode = Column(
        SqlEnum(
            LessonAccessMode,
            values_callable=lambda obj: [e.value for e in obj],
            name="lessonaccessmode",
        ),
        nullable=False,
        server_default=LessonAccessMode.OPEN.value,
    )
    avg_rating = Column(Float, nullable=True)
    ratings_count = Column(Integer, nullable=False, default=0, server_default="0")

    @hybrid_property
    def rating(self):
        return self.avg_rating

    @rating.setter
    def rating(self, value):
        self.avg_rating = value

    @rating.expression
    def rating(cls):
        return cls.avg_rating

    lessons = relationship(
        "LessonModel",
        back_populates="course",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    topics = relationship(
        "TopicModel",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="TopicModel.position",
    )


# ***************** VIRTUAL COLUMNS *****************
from modules.lessons.model import LessonModel
from modules.users.model import UserModel
from modules.topics.model import TopicModel
from sqlalchemy.orm import aliased

_InstructorCourse = aliased(CourseModel, name="instructor_course_count_alias")

CourseModel.lessons_count = column_property(
    select(func.count(LessonModel.id))
    .where(LessonModel.course_id == CourseModel.id)
    .correlate_except(LessonModel)
    .scalar_subquery(),
    deferred=True,
)

CourseModel.instructor_name = column_property(
    select(UserModel.name)
    .where(UserModel.id == CourseModel.instructor_id)
    .correlate_except(UserModel)
    .scalar_subquery(),
    deferred=True,
)

CourseModel.instructor_courses_count = column_property(
    select(func.count(_InstructorCourse.id))
    .where(
        _InstructorCourse.instructor_id == CourseModel.instructor_id,
        _InstructorCourse.is_public.is_(True),
    )
    .correlate(CourseModel)
    .scalar_subquery(),
    deferred=True,
)

CourseModel.topics_count = column_property(
    select(func.count(TopicModel.id))
    .where(TopicModel.course_id == CourseModel.id)
    .correlate_except(TopicModel)
    .scalar_subquery(),
    deferred=True,
)
