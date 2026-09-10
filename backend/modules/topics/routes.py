from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.i18n import http_error, msg
from modules.auth.service import get_current_user, get_optional_current_user
from modules.courses.permissions import is_course_editor
from modules.courses.service import get_course_detail
from modules.lessons.schema import LessonSchema
from modules.lessons.service import redact_locked_lessons
from modules.progress.access_service import get_unlocked_lesson_ids
from modules.topics.schema import (
    CourseCurriculumSchema,
    CurriculumImportResultSchema,
    CurriculumImportSchema,
    LessonsReorderInTopicSchema,
    TopicCreateSchema,
    TopicSchema,
    TopicUpdateSchema,
    TopicWithLessonsSchema,
    TopicsReorderSchema,
)
from modules.topics.service import (
    create_topic,
    import_curriculum,
    delete_topic,
    get_course_curriculum,
    get_topic,
    get_topics_by_course,
    reorder_lessons_in_topic,
    reorder_topics,
    update_topic,
)


topics_router = APIRouter(prefix="/courses", tags=["topics"])


@topics_router.get(
    "/{course_id}/curriculum",
    response_model=CourseCurriculumSchema,
    status_code=status.HTTP_200_OK,
)
def get_curriculum(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_optional_current_user),
):
    course = get_course_detail(db, course_id, user=user)
    topics = get_course_curriculum(db, course_id)
    # Computed once for the whole curriculum instead of once per topic.
    unlocked = get_unlocked_lesson_ids(db, course, user)
    return CourseCurriculumSchema(
        topics=[
            TopicWithLessonsSchema(
                id=topic.id,
                course_id=topic.course_id,
                name=topic.name,
                position=topic.position,
                lessons=redact_locked_lessons(
                    db, course, topic.lessons, user, unlocked=unlocked
                ),
            )
            for topic in topics
        ]
    )


@topics_router.get(
    "/{course_id}/topics",
    response_model=list[TopicSchema],
    status_code=status.HTTP_200_OK,
)
def list_topics(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_optional_current_user),
):
    get_course_detail(db, course_id, user=user)
    return get_topics_by_course(db, course_id)


@topics_router.post(
    "/{course_id}/topics",
    response_model=TopicSchema,
    status_code=status.HTTP_201_CREATED,
)
def add_topic(
    course_id: int,
    payload: TopicCreateSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    course = get_course_detail(db, course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(403, "insufficient_privileges")
    return create_topic(db, course_id, payload)


@topics_router.patch(
    "/topics/{topic_id}",
    response_model=TopicSchema,
    status_code=status.HTTP_200_OK,
)
def patch_topic(
    topic_id: int,
    payload: TopicUpdateSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    topic = get_topic(db, topic_id)
    if not topic:
        raise http_error(404, "topic_not_found")
    course = get_course_detail(db, topic.course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(403, "insufficient_privileges")
    updated = update_topic(db, topic_id, payload)
    if not updated:
        raise http_error(404, "topic_not_found")
    return updated


@topics_router.delete(
    "/topics/{topic_id}",
    status_code=status.HTTP_200_OK,
)
def remove_topic(
    topic_id: int,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    topic = get_topic(db, topic_id)
    if not topic:
        raise http_error(404, "topic_not_found")
    course = get_course_detail(db, topic.course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(403, "insufficient_privileges")
    ok = delete_topic(db, topic_id)
    if not ok:
        raise http_error(404, "topic_not_found")
    return {"detail": msg("topic_deleted")}


@topics_router.post(
    "/{course_id}/topics/reorder",
    response_model=list[TopicSchema],
    status_code=status.HTTP_200_OK,
)
def reorder_course_topics(
    course_id: int,
    payload: TopicsReorderSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    course = get_course_detail(db, course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(403, "insufficient_privileges")
    reordered = reorder_topics(db, course_id, payload.ordered_topic_ids)
    if reordered is None:
        raise http_error(400, "invalid_topic_ids_reorder")
    return reordered


@topics_router.post(
    "/topics/{topic_id}/lessons/reorder",
    response_model=list[LessonSchema],
    status_code=status.HTTP_200_OK,
)
def reorder_topic_lessons(
    topic_id: int,
    payload: LessonsReorderInTopicSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    topic = get_topic(db, topic_id)
    if not topic:
        raise http_error(404, "topic_not_found")
    course = get_course_detail(db, topic.course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(403, "insufficient_privileges")
    reordered = reorder_lessons_in_topic(db, topic_id, payload.ordered_lesson_ids)
    if reordered is None:
        raise http_error(400, "invalid_lesson_ids_reorder")
    return reordered


@topics_router.post(
    "/{course_id}/curriculum/import",
    response_model=CurriculumImportResultSchema,
    status_code=status.HTTP_201_CREATED,
)
def import_course_curriculum(
    course_id: int,
    payload: CurriculumImportSchema,
    db: Annotated[Session, Depends(get_db)],
    user=Depends(get_current_user),
):
    """Create a whole curriculum for a course from a single JSON document.

    Building a course lesson by lesson through the editor is slow; this takes
    the topics, lessons, questions and options in one go. Same format the demo
    seeder uses.

    `replace_existing` wipes the current topics first, which cascades into
    their lessons and the enrolled students' progress.
    """
    course = get_course_detail(db, course_id, user=user)
    if not is_course_editor(user, course):
        raise http_error(403, "insufficient_privileges")
    return import_curriculum(db, course_id, payload)
