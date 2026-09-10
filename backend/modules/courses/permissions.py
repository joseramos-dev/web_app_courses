"""Who is allowed to edit a course.

Single definition on purpose: this check used to be copy-pasted in
`lessons/routes.py`, `lessons/file_service.py`, `topics/routes.py` and, under
the name `_is_course_staff`, in `progress/access_service.py`. Four copies meant
that tightening it in one place fixed nothing.
"""

from modules.users.model import UserRole


def is_course_editor(user, course) -> bool:
    """True for an admin, or for the instructor who owns this course.

    The role is part of the check, not just the ownership: demoting an
    instructor to student leaves `instructor_id` pointing at them until the
    demotion releases it, and without this a student could still edit -- and
    create topics and lessons in -- the courses they used to own.
    """
    if user is None or course is None:
        return False
    if user.role == UserRole.ADMIN:
        return True
    return (
        user.role == UserRole.INSTRUCTOR
        and course.instructor_id is not None
        and user.id == course.instructor_id
    )
