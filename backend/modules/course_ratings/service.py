from fastapi import HTTPException
from sqlalchemy.orm import Session

from modules.course_ratings.model import CourseRatingModel
from modules.courses.service import get_course_detail
from modules.enrollments.model import EnrollmentStatus
from modules.enrollments.service import get_enrollment


def upsert_course_rating(db: Session, user_id: int, course_id: int, score: int):
    course = get_course_detail(db, course_id)
    enrollment = get_enrollment(db, user_id, course_id)
    if not enrollment or enrollment.status == EnrollmentStatus.DROPPED:
        return None
    lessons_count = int(getattr(course, "lessons_count", 0) or 0)
    completed = int(enrollment.completed_lessons_count or 0)
    # With lessons: require at least one completed. Empty course: enrolled students may rate.
    if lessons_count > 0 and completed < 1:
        raise HTTPException(
            status_code=403,
            detail="Complete at least one lesson before rating this course.",
        )
    row = (
        db.query(CourseRatingModel)
        .filter(
            CourseRatingModel.user_id == user_id,
            CourseRatingModel.course_id == course_id,
        )
        .first()
    )
    if row:
        row.score = score
    else:
        row = CourseRatingModel(
            user_id=user_id,
            course_id=course_id,
            score=score,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
