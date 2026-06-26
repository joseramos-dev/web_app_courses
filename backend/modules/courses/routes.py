from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Annotated, List, Optional
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from core.dependencies import PaginationParams, get_pagination, require_role, sort_map_column
from core.database import get_db
from modules.courses.schema import (
    CourseSchema,
    CoursePaginatedSchema,
    CourseUpdateSchema,
    CourseCreateSchema,
)
from modules.courses.service import populate_courses, get_course_detail, update_course, create_course
from modules.courses.model import CourseModel, Site, Category, Language, CourseType
from modules.auth.service import get_current_user
from modules.lessons.schema import LessonSchema, LessonsReorderSchema
from modules.lessons.service import get_lessons_by_course, reorder_lessons
from modules.users.model import UserModel, UserRole
from modules.enrollments.model import EnrollmentStatus
from modules.enrollments.service import get_enrollment
from modules.course_ratings.model import CourseRatingModel
from modules.course_ratings.schema import CourseRatingSchema, CourseRatingUpsertSchema
from modules.course_ratings.service import upsert_course_rating


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
                raise HTTPException(status_code=404, detail="Instructor not found")
            if target.role != UserRole.INSTRUCTOR:
                raise HTTPException(
                    status_code=400,
                    detail=f"User {target.id} is not an instructor",
                )
        return inst_id
    raise HTTPException(status_code=403, detail="You haven't enough privileges")


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
        raise HTTPException(
            status_code=403,
            detail="Only students can rate courses",
        )
    row = upsert_course_rating(db, user.id, course_id, payload.score)
    if row is None:
        raise HTTPException(
            status_code=403,
            detail="Must be enrolled in this course to rate",
        )
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
        raise HTTPException(
            status_code=403,
            detail="Only students can view their rating",
        )
    get_course_detail(db, course_id)
    enr = get_enrollment(db, user.id, course_id)
    if not enr or enr.status == EnrollmentStatus.DROPPED:
        raise HTTPException(
            status_code=403,
            detail="Must be enrolled in this course",
        )
    row = (
        db.query(CourseRatingModel)
        .filter(
            CourseRatingModel.user_id == user.id,
            CourseRatingModel.course_id == course_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No rating submitted yet")
    return row


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
        raise HTTPException(status_code=403, detail="You haven't enough privileges")

    # Only admins may change ownership. We compare against the current value
    # so a non-admin saving the form unchanged still works.
    if "instructor_id" in payload.model_fields_set and payload.instructor_id != course.instructor_id:
        if user.role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Only admins can reassign a course's instructor",
            )
        if payload.instructor_id is not None:
            target = (
                db.query(UserModel)
                .filter(UserModel.id == payload.instructor_id)
                .first()
            )
            if target is None:
                raise HTTPException(status_code=404, detail="Instructor not found")
            if target.role != UserRole.INSTRUCTOR:
                raise HTTPException(
                    status_code=400,
                    detail=f"User {target.id} is not an instructor",
                )

    return update_course(db, course_id, payload)


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
        raise HTTPException(status_code=403, detail="You haven't enough privileges")
    reordered = reorder_lessons(db, course_id, payload.ordered_lesson_ids)
    if reordered is None:
        raise HTTPException(status_code=400, detail="Invalid lesson ids for reorder")
    return reordered

# TODO: ONLY DURING DEVELOPMENT
@courses_router.post("/populate_courses", status_code=status.HTTP_200_OK)
def initiate_courses_db(
    db: Annotated[Session, Depends(get_db)],
    user = Depends(require_role(["admin"]))
    ):
    """
    Populate courses from database
    """
    populate_courses(db)
