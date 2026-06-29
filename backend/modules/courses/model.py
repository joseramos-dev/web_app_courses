from datetime import datetime
import enum

from sqlalchemy.sql import func

from sqlalchemy.orm import column_property, relationship
from core.database import Base
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Enum as SqlEnum,
    select,
)
from sqlalchemy.sql.functions import now


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
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    lessons = relationship(
        "LessonModel",
        back_populates="course",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# ***************** VIRTUAL COLUMNS *****************
from modules.lessons.model import LessonModel  
from modules.users.model import UserModel
from modules.course_ratings.model import CourseRatingModel

CourseModel.lessons_count = column_property(
    select(func.count(LessonModel.id))
    .where(LessonModel.course_id == CourseModel.id)
    .correlate_except(LessonModel)
    .scalar_subquery(),
    deferred=False,
)

CourseModel.instructor_name = column_property(
    select(UserModel.name)
    .where(UserModel.id == CourseModel.instructor_id)
    .correlate_except(UserModel)
    .scalar_subquery(),
    deferred=False,
)

CourseModel.rating = column_property(
    select(func.avg(CourseRatingModel.score))
    .where(CourseRatingModel.course_id == CourseModel.id)
    .correlate_except(CourseRatingModel)
    .scalar_subquery(),
    deferred=False,
)

CourseModel.ratings_count = column_property(
    select(func.count(CourseRatingModel.id))
    .where(CourseRatingModel.course_id == CourseModel.id)
    .correlate_except(CourseRatingModel)
    .scalar_subquery(),
    deferred=False,
)
