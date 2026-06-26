from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, List
from sqlalchemy.orm import Session
from core.database import get_db
from modules.lessons.schema import (
    LessonSchema,
    LessonCreateSchema,
    LessonUpdateSchema,
    LessonsReorderSchema,
    QuestionPublicSchema,
    QuestionAdminSchema,
    QuestionCreateSchema,
    QuestionUpdateSchema,
)
from modules.lessons.service import (
    get_lessons as get_lessons_service,
    get_lessons_by_course as get_lessons_by_course_service,
    create_lesson as create_lesson_service,
    update_lesson as update_lesson_service,
    delete_lesson as delete_lesson_service,
    reorder_lessons as reorder_lessons_service,
    get_questions_by_lesson as get_questions_by_lesson_service,
    create_question as create_question_service,
    update_question as update_question_service,
    delete_question as delete_question_service,
)
from modules.auth.service import get_current_user
from modules.courses.service import get_course_detail
from modules.lessons.model import LessonModel
from modules.enrollments.model import EnrollmentModel

lessons_router = APIRouter(
    prefix="/lessons",
    tags=["lessons"],
)


def _require_lesson(db: Session, lesson_id: int) -> LessonModel:
    lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


def _is_course_editor(user, course) -> bool:
    return user.role == "admin" or (
        course.instructor_id is not None and user.id == course.instructor_id
    )


@lessons_router.get("/", response_model=List[LessonSchema], status_code=status.HTTP_200_OK)
def get_lessons(db: Annotated[Session, Depends(get_db)]):
    """
    Get all lessons for a course
    """
    return get_lessons_service(db)


@lessons_router.get(
    "/course/{course_id}",
    response_model=List[LessonSchema],
    status_code=status.HTTP_200_OK,
)
def get_lessons_for_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Get all lessons for a specific course
    """
    return get_lessons_by_course_service(db, course_id)


@lessons_router.get("/{lesson_id}", response_model=LessonSchema, status_code=status.HTTP_200_OK)
def get_lesson_by_id(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Get a single lesson with its content (body / video_url).
    """
    return _require_lesson(db, lesson_id)


@lessons_router.post(
    "/{course_id}",
    response_model=LessonSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson(
    course_id: int,
    lesson: LessonCreateSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """
    Create a new lesson for a course
    """
    course = get_course_detail(db, course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")
    return create_lesson_service(db, course_id, lesson)


@lessons_router.patch("/{lesson_id}", response_model=LessonSchema, status_code=status.HTTP_200_OK)
def patch_lesson(
    lesson_id: int,
    payload: LessonUpdateSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    lesson = _require_lesson(db, lesson_id)
    course = get_course_detail(db, lesson.course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")

    updated = update_lesson_service(db, lesson_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return updated


@lessons_router.delete("/{lesson_id}", status_code=status.HTTP_200_OK)
def remove_lesson(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    lesson = _require_lesson(db, lesson_id)
    course = get_course_detail(db, lesson.course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")

    ok = delete_lesson_service(db, lesson_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {"detail": "Lesson deleted"}


@lessons_router.post(
    "/course/{course_id}/reorder",
    response_model=List[LessonSchema],
    status_code=status.HTTP_200_OK,
)
def reorder_course_lessons(
    course_id: int,
    payload: LessonsReorderSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    course = get_course_detail(db, course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")

    reordered = reorder_lessons_service(db, course_id, payload.ordered_lesson_ids)
    if reordered is None:
        raise HTTPException(status_code=400, detail="Invalid lesson ids for reorder")
    return reordered


# ---------- Questions ----------

@lessons_router.get(
    "/{lesson_id}/questions",
    response_model=List[QuestionPublicSchema],
    status_code=status.HTTP_200_OK,
)
def get_lesson_questions_public(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """
    Questions exposed to the student taking the lesson.
    Hides `is_correct`. Requires the user to be enrolled in the course
    (admins and the course instructor can also see them).
    """
    lesson = _require_lesson(db, lesson_id)
    course = get_course_detail(db, lesson.course_id)

    if not _is_course_editor(user, course):
        enrolled = (
            db.query(EnrollmentModel)
            .filter(
                EnrollmentModel.user_id == user.id,
                EnrollmentModel.course_id == lesson.course_id,
            )
            .first()
        )
        if not enrolled:
            raise HTTPException(
                status_code=403, detail="You must enroll in the course first"
            )

    return get_questions_by_lesson_service(db, lesson_id)


@lessons_router.get(
    "/{lesson_id}/questions/admin",
    response_model=List[QuestionAdminSchema],
    status_code=status.HTTP_200_OK,
)
def get_lesson_questions_admin(
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """
    Questions exposed to admins/instructors editing the lesson.
    Reveals `is_correct`.
    """
    lesson = _require_lesson(db, lesson_id)
    course = get_course_detail(db, lesson.course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")
    return get_questions_by_lesson_service(db, lesson_id)


@lessons_router.post(
    "/{lesson_id}/questions",
    response_model=QuestionAdminSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson_question(
    lesson_id: int,
    payload: QuestionCreateSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    lesson = _require_lesson(db, lesson_id)
    course = get_course_detail(db, lesson.course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")
    return create_question_service(db, lesson_id, payload)


@lessons_router.put(
    "/{lesson_id}/questions/{question_id}",
    response_model=QuestionAdminSchema,
    status_code=status.HTTP_200_OK,
)
def update_lesson_question(
    lesson_id: int,
    question_id: int,
    payload: QuestionUpdateSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    lesson = _require_lesson(db, lesson_id)
    course = get_course_detail(db, lesson.course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")
    updated = update_question_service(db, question_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated


@lessons_router.delete(
    "/{lesson_id}/questions/{question_id}",
    status_code=status.HTTP_200_OK,
)
def delete_lesson_question(
    lesson_id: int,
    question_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    lesson = _require_lesson(db, lesson_id)
    course = get_course_detail(db, lesson.course_id)
    if not _is_course_editor(user, course):
        raise HTTPException(status_code=403, detail="You haven't enough privileges")
    ok = delete_question_service(db, question_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"detail": "Question deleted"}
