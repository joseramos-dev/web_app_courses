"""What a role change drags behind it.

Changing `users.role` used to be a bare UPDATE, which left the account in a
half-broken state: a promoted student kept every enrollment, every completed
lesson and every rating, but could no longer reach their dashboard, their
recommendations or -- because the unlock check only looks up enrollments for
students -- the very courses they were taking. In the other direction a demoted
instructor kept editing the courses they owned.

So a role change is now an operation with consequences: leaving the student role
deletes the learning history, and becoming a student releases the courses.
"""

from sqlalchemy.orm import Session

from modules.course_ratings.model import CourseRatingModel
from modules.course_ratings.stats import refresh_course_rating_stats
from modules.courses.model import CourseModel
from modules.enrollments.model import EnrollmentModel
from modules.lessons.model import LessonFileModel
from modules.notifications.model import NotificationModel, NotificationType
from modules.progress.model import StudyActivityModel
from modules.recommendations.model import RecommendationModel
from modules.users.model import UserModel, UserRole

# Everything a student receives. `SUBMISSION` is the one addressed to the
# instructor, so it survives the promotion.
STUDENT_NOTIFICATIONS = (
    NotificationType.NEW_LESSON,
    NotificationType.LESSON_REMOVED,
    NotificationType.COURSE_VISIBILITY,
    NotificationType.GRADE,
)


def purge_student_data(db: Session, user_ids: list[int]) -> dict[str, int]:
    """Delete everything only a student can own. Does not commit.

    Deleting the enrollments is enough for `lesson_progress`, `lesson_attempts`
    and `lesson_submissions`: all three cascade from it in the database.
    """
    if not user_ids:
        return {
            "enrollments": 0,
            "ratings": 0,
            "activity_days": 0,
            "submission_files": 0,
            "notifications": 0,
        }

    # Noted before the delete so the courses can be re-averaged afterwards:
    # `courses.avg_rating` is denormalised and nothing recomputes it when the
    # ratings vanish underneath.
    rated_course_ids = [
        course_id
        for (course_id,) in db.query(CourseRatingModel.course_id)
        .filter(CourseRatingModel.user_id.in_(user_ids))
        .distinct()
    ]

    ratings = (
        db.query(CourseRatingModel)
        .filter(CourseRatingModel.user_id.in_(user_ids))
        .delete(synchronize_session=False)
    )
    activity = (
        db.query(StudyActivityModel)
        .filter(StudyActivityModel.user_id.in_(user_ids))
        .delete(synchronize_session=False)
    )
    notifications = (
        db.query(NotificationModel)
        .filter(
            NotificationModel.user_id.in_(user_ids),
            NotificationModel.type.in_(STUDENT_NOTIFICATIONS),
        )
        .delete(synchronize_session=False)
    )
    enrollments = (
        db.query(EnrollmentModel)
        .filter(EnrollmentModel.user_id.in_(user_ids))
        .delete(synchronize_session=False)
    )

    # Assignment uploads hang off the lesson, not the enrollment, so nothing
    # cascades them away. Deleted one by one on purpose: a bulk delete skips ORM
    # events, and the `after_delete` listener is what removes the file from disk.
    submission_files = (
        db.query(LessonFileModel)
        .filter(
            LessonFileModel.uploaded_by.in_(user_ids),
            LessonFileModel.is_submission.is_(True),
        )
        .all()
    )
    for row in submission_files:
        db.delete(row)

    # The row itself is kept: registration creates one for every account.
    db.query(RecommendationModel).filter(
        RecommendationModel.user_id.in_(user_ids)
    ).update(
        {
            "preferred_sites": [],
            "preferred_categories": [],
            "preferred_languages": [],
            "preferred_course_types": [],
            "preferred_duration_buckets": [],
            "preferred_difficulties": [],
        },
        synchronize_session=False,
    )
    db.flush()

    for course_id in rated_course_ids:
        refresh_course_rating_stats(db, course_id)

    return {
        "enrollments": enrollments,
        "ratings": ratings,
        "activity_days": activity,
        "submission_files": len(submission_files),
        "notifications": notifications,
    }


def release_owned_courses(db: Session, user_id: int) -> int:
    """Leave the courses this user authored without an owner. Does not commit.

    The course keeps its topics, lessons and enrolled students; only the
    authorship goes, which is the state the whole imported catalogue is already
    in. A student must never be the instructor of a course.
    """
    released = (
        db.query(CourseModel)
        .filter(CourseModel.instructor_id == user_id)
        .update({"instructor_id": None}, synchronize_session=False)
    )
    db.flush()
    return released


def apply_role_change(db: Session, user: UserModel, new_role: UserRole) -> dict[str, int]:
    """Side effects of moving `user` to `new_role`. Does not commit.

    Decided by the destination role, which covers every transition without
    special cases. A no-op when the role does not actually change -- without
    that guard, re-picking "student" on a student would wipe their history.
    """
    if user.role == new_role:
        return {}

    if new_role == UserRole.STUDENT:
        return {"courses_released": release_owned_courses(db, user.id)}
    return purge_student_data(db, [user.id])
