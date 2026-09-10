from sqlalchemy.orm import Query, undefer

from modules.courses.model import CourseModel


def with_course_computed_columns(query: Query) -> Query:
    return query.options(
        undefer(CourseModel.lessons_count),
        undefer(CourseModel.instructor_name),
        undefer(CourseModel.instructor_courses_count),
        undefer(CourseModel.topics_count),
    )
