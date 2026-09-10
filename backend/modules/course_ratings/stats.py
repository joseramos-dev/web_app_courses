from sqlalchemy import func
from sqlalchemy.orm import Session

from modules.course_ratings.model import CourseRatingModel
from modules.courses.model import CourseModel


def refresh_course_rating_stats(db: Session, course_id: int) -> None:
    row = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if row is None:
        return

    avg_score, count = (
        db.query(
            func.avg(CourseRatingModel.score),
            func.count(CourseRatingModel.id),
        )
        .filter(CourseRatingModel.course_id == course_id)
        .one()
    )

    row.avg_rating = float(avg_score) if avg_score is not None else None
    row.ratings_count = int(count or 0)
    db.add(row)
