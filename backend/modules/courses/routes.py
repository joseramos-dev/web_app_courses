from fastapi import APIRouter, Depends, Query, status
from typing import Annotated, List, Optional
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from core.dependencies import PaginationParams, get_pagination, require_role, sort_map_column
from core.database import get_db
from core.config import ENABLE_DEV_ROUTES
from core.i18n import http_error, msg
from modules.courses.schema import (
    CourseSchema,
    CoursePaginatedSchema,
    CourseUpdateSchema,
    CourseCreateSchema,
)
from modules.courses.service import (
    populate_courses,
    get_course_detail,
    update_course,
    create_course,
    delete_course,
)
from modules.courses.model import CourseModel, Site, Category, Language, CourseType, DurationBucket, Difficulty
from modules.courses.duration_utils import duration_bucket_filter
from modules.auth.service import get_current_user
from modules.lessons.schema import LessonSchema, LessonsReorderSchema
from modules.lessons.service import get_lessons_by_course, reorder_lessons
from modules.users.model import UserModel, UserRole
from modules.enrollments.model import EnrollmentStatus
from modules.enrollments.service import get_enrollment
from modules.course_ratings.model import CourseRatingModel
from modules.course_ratings.schema import CourseRatingSchema, CourseRatingUpsertSchema
from modules.course_ratings.service import upsert_course_rating
from modules.courses.instructor_schema import (
    InstructorCourseStudentsSchema,
    InstructorStudentDetailSchema,
)
from modules.courses.instructor_service import (
    assert_can_manage_course,
    get_student_detail,
    list_course_students,
)
from modules.progress.model import SubmissionStatus
from modules.progress.submission_schema import (
    GradeSubmissionResultSchema,
    GradeSubmissionSchema,
    SubmissionListSchema,
    SubmissionSchema,
)
from modules.progress.submission_service import (
    grade_submission,
    list_course_submissions,
)


def _resolve_create_instructor_id(
    db: Session,
    user,
    payload: CourseCreateSchema,
) -> int | None:
    if user.role == UserRole.INSTRUCTOR:
        return user.id
    if user.role == UserRole.ADMIN:
        inst_id = payload.instructor_id
        if inst_id is not None:
            target = (
                db.query(UserModel)
                .filter(UserModel.id == inst_id)
                .first()
            )
            if target is None:
                raise http_error(404, "instructor_not_found")
            if target.role != UserRole.INSTRUCTOR:
                raise http_error(
                    400,
                    "user_not_instructor",
                    user_id=target.id,
                )
        return inst_id
    raise http_error(403, "insufficient_privileges")


courses_router = APIRouter(
    prefix="/courses",
    tags=["courses"],
)


@courses_router.get("/", response_model=CoursePaginatedSchema, status_code=status.HTTP_200_OK)
def get_courses(
    db: Annotated[Session, Depends(get_db)],
    pag: PaginationParams = Depends(get_pagination),
    search: Optional[str] = "",
    site: Optional[List[Site]] = Query(None),
    category: Optional[List[Category]] = Query(None),
    language: Optional[List[Language]] = Query(None),
    course_type: Optional[List[CourseType]] = Query(None),
    duration_bucket: Optional[List[DurationBucket]] = Query(None),
    difficulty: Optional[List[Difficulty]] = Query(None),
):
    """
    Get all courses from database with support for multiple filter values
    """
    query = db.query(CourseModel)
    if search:
        query = query.filter(CourseModel.title.ilike(f"%{search}%"))
    if category:
        query = query.filter(CourseModel.category.in_(category))
    if language:
        query = query.filter(CourseModel.language.in_(language))
    if site:
        query = query.filter(CourseModel.site.in_(site))
    if course_type:
        query = query.filter(CourseModel.course_type.in_(course_type))
    if duration_bucket:
        query = duration_bucket_filter(query, duration_bucket)
    if difficulty:
        query = query.filter(CourseModel.difficulty.in_(difficulty))
    total = query.count()
    sort_column = sort_map_column(pag.sort_by)
    if pag.order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))
    return CoursePaginatedSchema(
        courses=query.offset(pag.offset).limit(pag.limit).all(),
        total=total,
        limit=pag.limit,
        offset=pag.offset,
    )


@courses_router.post(
    "/create",
    response_model=CourseSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_course_route(
    db: Annotated[Session, Depends(get_db)],
    payload: CourseCreateSchema,
    user=Depends(get_current_user),
):
    """
    Create a new course. Instructors own the course automatically; admins may
    set `instructor_id` or leave it unassigned.
    """
    instructor_id = _resolve_create_instructor_id(db, user, payload)
    return create_course(db, payload, instructor_id)


@courses_router.put(
    "/{course_id}/rating",
    response_model=CourseRatingSchema,
    status_code=status.HTTP_200_OK,
)
def put_my_course_rating(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    payload: CourseRatingUpsertSchema,
    user=Depends(get_current_user),
):
    if user.role != UserRole.STUDENT:
        raise http_error(403, "only_students_rate")
    row = upsert_course_rating(db, user.id, course_id, payload.score)
    if row is None:
        raise http_error(403, "must_enroll_to_rate")
    return row


@courses_router.get(
    "/{course_id}/rating/me",
    response_model=CourseRatingSchema,
    status_code=status.HTTP_200_OK,
)
def get_my_course_rating(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    user=Depends(get_current_user),
):
    if user.role != UserRole.STUDENT:
        raise http_error(403, "only_students_view_rating")
    get_course_detail(db, course_id)
    enr = get_enrollment(db, user.id, course_id)
    if not enr or enr.status == EnrollmentStatus.DROPPED:
        raise http_error(403, "must_enroll")
    row = (
        db.query(CourseRatingModel)
        .filter(
            CourseRatingModel.user_id == user.id,
            CourseRatingModel.course_id == course_id,
        )
        .first()
    )
    if not row:
        raise http_error(404, "no_rating_submitted")
    return row


@courses_router.get(
    "/{course_id}/instructor/enrollments",
    response_model=InstructorCourseStudentsSchema,
    status_code=status.HTTP_200_OK,
)
def list_instructor_course_enrollments(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    user=Depends(get_current_user),
):
    """List enrolled students and course-level progress stats for the instructor."""
    assert_can_manage_course(db, course_id, user)
    return list_course_students(db, course_id)


@courses_router.get(
    "/{course_id}/instructor/enrollments/{user_id}",
    response_model=InstructorStudentDetailSchema,
    status_code=status.HTTP_200_OK,
)
def get_instructor_student_detail(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    user_id: int,
    user=Depends(get_current_user),
):
    """Per-lesson progress for one student in a course (instructor or admin)."""
    assert_can_manage_course(db, course_id, user)
    return get_student_detail(db, course_id, user_id)


@courses_router.get(
    "/{course_id}/submissions",
    response_model=SubmissionListSchema,
    status_code=status.HTTP_200_OK,
)
def list_course_assignment_submissions(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    status_filter: Optional[SubmissionStatus] = Query(
        None, alias="status", description="Filter by submission status"
    ),
    user=Depends(get_current_user),
):
    """List assignment submissions for a course (instructor or admin)."""
    submissions = list_course_submissions(db, course_id, user, status_filter)
    return SubmissionListSchema(submissions=submissions)


@courses_router.patch(
    "/{course_id}/submissions/{submission_id}/grade",
    response_model=GradeSubmissionResultSchema,
    status_code=status.HTTP_200_OK,
)
def grade_course_submission(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    submission_id: int,
    payload: GradeSubmissionSchema,
    user=Depends(get_current_user),
):
    """Grade or return an assignment submission (instructor or admin)."""
    submission, lesson_completed = grade_submission(
        db,
        user.id,
        course_id,
        user,
        submission_id,
        payload.score,
        payload.feedback,
        payload.returned,
    )
    return GradeSubmissionResultSchema(
        submission=submission,
        lesson_completed=lesson_completed,
    )


@courses_router.get("/{course_id}", response_model=CourseSchema, status_code=status.HTTP_200_OK)
def get_course_detail_by_id(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
):
    """
    Get course detail from database
    """
    return get_course_detail(db, course_id)


@courses_router.put("/{course_id}", response_model=CourseSchema, status_code=status.HTTP_200_OK)
def update_course_by_id(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    payload: CourseUpdateSchema,
    user=Depends(get_current_user),
):
    """
    Update a course.
    Allowed: admin OR instructor-owner (user.id == course.instructor_id).
    Reassigning `instructor_id` is restricted to admins, and the new id must
    point to a user with role=instructor (or be `None` to unassign).
    """
    course = get_course_detail(db, course_id)
    if user.role != "admin" and (course.instructor_id is None or user.id != course.instructor_id):
        raise http_error(403, "insufficient_privileges")

    # Only admins may change ownership. We compare against the current value
    # so a non-admin saving the form unchanged still works.
    if "instructor_id" in payload.model_fields_set and payload.instructor_id != course.instructor_id:
        if user.role != "admin":
            raise http_error(403, "only_admins_reassign_instructor")
        if payload.instructor_id is not None:
            target = (
                db.query(UserModel)
                .filter(UserModel.id == payload.instructor_id)
                .first()
            )
            if target is None:
                raise http_error(404, "instructor_not_found")
            if target.role != UserRole.INSTRUCTOR:
                raise http_error(
                    400,
                    "user_not_instructor",
                    user_id=target.id,
                )

    return update_course(db, course_id, payload)


@courses_router.delete(
    "/{course_id}",
    status_code=status.HTTP_200_OK,
)
def delete_course_by_id(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    user=Depends(get_current_user),
):
    """
    Delete a course and all dependent rows (lessons, enrollments, ratings, …)
    via database ON DELETE CASCADE.
    Allowed: admin OR instructor-owner (user.id == course.instructor_id).
    """
    course = get_course_detail(db, course_id)
    if user.role != "admin" and (
        course.instructor_id is None or user.id != course.instructor_id
    ):
        raise http_error(403, "insufficient_privileges")
    delete_course(db, course_id)
    return {"detail": msg("course_deleted")}


@courses_router.get(
    "/{course_id}/lessons",
    response_model=list[LessonSchema],
    status_code=status.HTTP_200_OK,
)
def get_course_lessons(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
):
    """
    Get lessons for a course.
    """
    _ = get_course_detail(db, course_id)
    return get_lessons_by_course(db, course_id)


@courses_router.post(
    "/{course_id}/lessons/reorder",
    response_model=list[LessonSchema],
    status_code=status.HTTP_200_OK,
)
def reorder_course_lessons(
    db: Annotated[Session, Depends(get_db)],
    course_id: int,
    payload: LessonsReorderSchema,
    user=Depends(get_current_user),
):
    """
    Reorder lessons within a course.
    Allowed: admin OR instructor-owner.
    """
    course = get_course_detail(db, course_id)
    if user.role != "admin" and (course.instructor_id is None or user.id != course.instructor_id):
        raise http_error(403, "insufficient_privileges")
    reordered = reorder_lessons(db, course_id, payload.ordered_lesson_ids)
    if reordered is None:
        raise http_error(400, "invalid_lesson_ids_reorder")
    return reordered

if ENABLE_DEV_ROUTES:

    @courses_router.post("/populate_courses", status_code=status.HTTP_200_OK)
    def initiate_courses_db(
        db: Annotated[Session, Depends(get_db)],
        user=Depends(require_role(["admin"])),
    ):
        """Development only: import courses from Kaggle CSV."""
        populate_courses(db)
