"""Pydantic schemas for the role-specific dashboard endpoints.

Each dashboard endpoint returns a single payload that the frontend can
render without further round-trips. We co-locate the small helper schemas
(daily activity, recent items, top rankings) here so the file reads
top-down from atomic to composite.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from modules.courses.model import Category
from modules.progress.model import LessonProgressStatus


# ---------- Atomic helpers ----------

class DailyActivitySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    lessons_started: int
    lessons_completed: int


class TopStudentSchema(BaseModel):
    user_id: int
    name: str
    lessons_completed_in_window: int


class TopLessonSchema(BaseModel):
    lesson_id: int
    lesson_title: str
    course_id: int
    course_title: str
    completed_count: int


class TopCourseSchema(BaseModel):
    course_id: int
    course_title: str
    enrollments_count: int


class CategoryStatSchema(BaseModel):
    category: Category
    enrollments_count: int


# ---------- Student ----------

class RecentCourseSchema(BaseModel):
    course_id: int
    course_title: str
    progress_percent: float
    completed_lessons_count: int
    total_lessons: int
    last_activity_at: Optional[datetime] = None
    next_lesson_id: Optional[int] = None


class CompletedCourseRowSchema(BaseModel):
    course_id: int
    course_title: str
    completed_at: Optional[datetime] = None


class RecentLessonSchema(BaseModel):
    lesson_id: int
    lesson_title: str
    course_id: int
    course_title: str
    status: LessonProgressStatus
    last_activity_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class StudentDashboardSchema(BaseModel):
    in_progress_count: int
    completed_count: int
    total_lessons_completed: int
    streak_days: int
    last_7_days: List[DailyActivitySchema]
    recent_courses: List[RecentCourseSchema]
    completed_courses: List[CompletedCourseRowSchema]
    recent_lessons: List[RecentLessonSchema]


# ---------- Instructor ----------

class InstructorCourseRowSchema(BaseModel):
    course_id: int
    course_title: str
    students_count: int
    avg_progress_percent: float
    completed_students: int
    last_activity_at: Optional[datetime] = None


class InstructorDashboardSchema(BaseModel):
    courses_count: int
    total_students: int
    avg_progress_percent: float
    completed_students: int
    courses: List[InstructorCourseRowSchema]
    top_active_students: List[TopStudentSchema]
    top_completed_lessons: List[TopLessonSchema]


# ---------- Admin ----------

class AdminDashboardSchema(BaseModel):
    students_count: int
    courses_count: int
    active_enrollments_count: int
    total_lessons_completed: int
    top_courses: List[TopCourseSchema]
    top_active_students: List[TopStudentSchema]
    category_distribution: List[CategoryStatSchema]
    last_30_days: List[DailyActivitySchema]
