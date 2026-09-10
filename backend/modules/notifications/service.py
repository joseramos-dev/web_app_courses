from datetime import datetime, timezone
from typing import Callable, Optional

from sqlalchemy.orm import Session

from core.i18n import http_error, msg, set_language, DEFAULT_LANGUAGE
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus
from modules.notifications.model import NotificationModel, NotificationType


def create_notification(
    db: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    body: str,
    link: Optional[str] = None,
) -> NotificationModel:
    row = NotificationModel(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link,
    )
    db.add(row)
    return row


def _localized_msg(key: str, **params) -> str:
    """Resolve notification text in the default app language."""
    set_language(DEFAULT_LANGUAGE)
    return msg(key, **params)


def notify_enrolled_students(
    db: Session,
    course_id: int,
    type: NotificationType,
    title_fn: Callable[[int], str],
    body_fn: Callable[[int], str],
    link_fn: Callable[[int], str],
) -> None:
    enrollments = (
        db.query(EnrollmentModel)
        .filter(
            EnrollmentModel.course_id == course_id,
            EnrollmentModel.status != EnrollmentStatus.DROPPED,
        )
        .all()
    )
    for enrollment in enrollments:
        create_notification(
            db,
            user_id=enrollment.user_id,
            type=type,
            title=title_fn(enrollment.user_id),
            body=body_fn(enrollment.user_id),
            link=link_fn(enrollment.user_id),
        )


def notify_submission_to_instructor(
    db: Session,
    *,
    instructor_id: int,
    student_name: str,
    lesson_title: str,
    course_id: int,
) -> None:
    create_notification(
        db,
        user_id=instructor_id,
        type=NotificationType.SUBMISSION,
        title=_localized_msg("notification_submission_title"),
        body=_localized_msg(
            "notification_submission_body",
            student_name=student_name,
            lesson_title=lesson_title,
        ),
        link=f"/course/{course_id}/students",
    )


def notify_grade_to_student(
    db: Session,
    *,
    student_user_id: int,
    lesson_title: str,
    score: float,
    course_id: int,
    lesson_id: int,
    returned: bool,
) -> None:
    if returned:
        title_key = "notification_grade_returned_title"
        body_key = "notification_grade_returned_body"
    else:
        title_key = "notification_grade_title"
        body_key = "notification_grade_body"

    create_notification(
        db,
        user_id=student_user_id,
        type=NotificationType.GRADE,
        title=_localized_msg(title_key),
        body=_localized_msg(body_key, lesson_title=lesson_title, score=score),
        link=f"/course/{course_id}/lesson/{lesson_id}",
    )


def notify_new_lesson_to_enrolled(
    db: Session,
    *,
    course_id: int,
    lesson_id: int,
    lesson_title: str,
    course_title: str,
) -> None:
    notify_enrolled_students(
        db,
        course_id,
        NotificationType.NEW_LESSON,
        title_fn=lambda _uid: _localized_msg("notification_new_lesson_title"),
        body_fn=lambda _uid: _localized_msg(
            "notification_new_lesson_body",
            course_title=course_title,
            lesson_title=lesson_title,
        ),
        link_fn=lambda _uid: f"/course/{course_id}/lesson/{lesson_id}",
    )


def notify_lesson_removed_to_enrolled(
    db: Session,
    *,
    course_id: int,
    lesson_title: str,
    course_title: str,
) -> None:
    notify_enrolled_students(
        db,
        course_id,
        NotificationType.LESSON_REMOVED,
        title_fn=lambda _uid: _localized_msg("notification_lesson_removed_title"),
        body_fn=lambda _uid: _localized_msg(
            "notification_lesson_removed_body",
            course_title=course_title,
            lesson_title=lesson_title,
        ),
        link_fn=lambda _uid: f"/course/{course_id}",
    )


def notify_course_visibility_to_enrolled(
    db: Session,
    *,
    course_id: int,
    course_title: str,
    is_public: bool,
) -> None:
    title_key = (
        "notification_course_public_title"
        if is_public
        else "notification_course_private_title"
    )
    body_key = (
        "notification_course_public_body"
        if is_public
        else "notification_course_private_body"
    )
    notify_enrolled_students(
        db,
        course_id,
        NotificationType.COURSE_VISIBILITY,
        title_fn=lambda _uid: _localized_msg(title_key),
        body_fn=lambda _uid: _localized_msg(body_key, course_title=course_title),
        link_fn=lambda _uid: f"/course/{course_id}",
    )


def list_notifications(
    db: Session,
    user_id: int,
    limit: int,
    offset: int,
) -> tuple[list[NotificationModel], int]:
    base = db.query(NotificationModel).filter(NotificationModel.user_id == user_id)
    total = base.count()
    rows = (
        base.order_by(NotificationModel.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return rows, total


def count_unread(db: Session, user_id: int) -> int:
    return (
        db.query(NotificationModel)
        .filter(
            NotificationModel.user_id == user_id,
            NotificationModel.read_at.is_(None),
        )
        .count()
    )


def mark_read(db: Session, user_id: int, notification_id: int) -> NotificationModel:
    row = (
        db.query(NotificationModel)
        .filter(
            NotificationModel.id == notification_id,
            NotificationModel.user_id == user_id,
        )
        .first()
    )
    if row is None:
        raise http_error(404, "notification_not_found")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
    return row


def mark_all_read(db: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    (
        db.query(NotificationModel)
        .filter(
            NotificationModel.user_id == user_id,
            NotificationModel.read_at.is_(None),
        )
        .update({NotificationModel.read_at: now}, synchronize_session=False)
    )
