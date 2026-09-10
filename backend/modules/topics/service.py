from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from core.i18n import http_error
from modules.courses.model import CourseModel
from modules.lessons.model import AnswerOptionModel, LessonModel, QuestionModel
from modules.lessons.service import recalc_course_duration
from modules.topics.model import TopicModel
from modules.topics.schema import (
    CurriculumImportResultSchema,
    CurriculumImportSchema,
    TopicCreateSchema,
    TopicUpdateSchema,
)

DEFAULT_TOPIC_NAME = "Course content"


def create_default_topic(db: Session, course_id: int) -> TopicModel:
    topic = TopicModel(course_id=course_id, name=DEFAULT_TOPIC_NAME, position=1)
    db.add(topic)
    db.flush()
    return topic


def get_topics_by_course(db: Session, course_id: int) -> list[TopicModel]:
    return (
        db.query(TopicModel)
        .filter(TopicModel.course_id == course_id)
        .order_by(TopicModel.position.asc())
        .all()
    )


def get_topic(db: Session, topic_id: int) -> TopicModel | None:
    return db.query(TopicModel).filter(TopicModel.id == topic_id).first()


def create_topic(db: Session, course_id: int, payload: TopicCreateSchema) -> TopicModel:
    if payload.position is not None:
        position = payload.position
    else:
        max_pos = (
            db.query(TopicModel.position)
            .filter(TopicModel.course_id == course_id)
            .order_by(TopicModel.position.desc())
            .first()
        )
        position = (max_pos[0] if max_pos else 0) + 1

    topic = TopicModel(course_id=course_id, name=payload.name.strip(), position=position)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


def update_topic(
    db: Session, topic_id: int, payload: TopicUpdateSchema
) -> TopicModel | None:
    topic = get_topic(db, topic_id)
    if not topic:
        return None
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if key == "name" and value is not None:
            setattr(topic, key, value.strip())
        else:
            setattr(topic, key, value)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


def delete_topic(db: Session, topic_id: int) -> bool:
    topic = get_topic(db, topic_id)
    if not topic:
        return False
    lesson_count = (
        db.query(LessonModel).filter(LessonModel.topic_id == topic_id).count()
    )
    if lesson_count > 0:
        raise http_error(400, "topic_not_empty")
    db.delete(topic)
    db.commit()
    return True


def reorder_topics(db: Session, course_id: int, ordered_topic_ids: list[int]) -> list[TopicModel]:
    topics = get_topics_by_course(db, course_id)
    by_id = {t.id: t for t in topics}
    if set(by_id.keys()) != set(ordered_topic_ids):
        return None
    for topic in topics:
        topic.position = -topic.position
    db.flush()
    for idx, topic_id in enumerate(ordered_topic_ids, start=1):
        by_id[topic_id].position = idx
    db.commit()
    return get_topics_by_course(db, course_id)


def reorder_lessons_in_topic(
    db: Session, topic_id: int, ordered_lesson_ids: list[int]
) -> list[LessonModel]:
    lessons = (
        db.query(LessonModel)
        .filter(LessonModel.topic_id == topic_id)
        .order_by(LessonModel.position.asc())
        .all()
    )
    by_id = {l.id: l for l in lessons}
    if set(by_id.keys()) != set(ordered_lesson_ids):
        return None
    for lesson in lessons:
        lesson.position = -lesson.position
    db.flush()
    for idx, lesson_id in enumerate(ordered_lesson_ids, start=1):
        by_id[lesson_id].position = idx
    db.commit()
    return (
        db.query(LessonModel)
        .filter(LessonModel.topic_id == topic_id)
        .order_by(LessonModel.position.asc())
        .all()
    )


def get_course_curriculum(db: Session, course_id: int) -> list[TopicModel]:
    return (
        db.query(TopicModel)
        .options(joinedload(TopicModel.lessons))
        .filter(TopicModel.course_id == course_id)
        .order_by(TopicModel.position.asc())
        .all()
    )


def import_curriculum(
    db: Session,
    course_id: int,
    payload: CurriculumImportSchema,
) -> CurriculumImportResultSchema:
    """Bulk-create topics, lessons, questions and options for a course.

    Shared by the admin endpoint and the demo seeder so the JSON contract lives
    in one place.

    Deliberately bypasses `create_lesson`: that service notifies every enrolled
    student and recalculates their progress on *each* lesson, which is fine for
    one lesson and quadratic for a whole curriculum. Here the objects are built
    with their relationships and committed once, and the course duration is
    recalculated a single time at the end.
    """
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if course is None:
        raise http_error(404, "course_not_found")

    if payload.replace_existing:
        # Cascades into lessons and, through them, the students' progress.
        db.query(TopicModel).filter(TopicModel.course_id == course_id).delete(
            synchronize_session="fetch"
        )
        db.flush()
        next_position = 1
    else:
        highest = (
            db.query(func.max(TopicModel.position))
            .filter(TopicModel.course_id == course_id)
            .scalar()
        )
        next_position = (highest or 0) + 1

    lessons_created = 0
    questions_created = 0

    for topic_offset, topic_in in enumerate(payload.topics):
        topic = TopicModel(
            course_id=course_id,
            name=topic_in.name,
            position=next_position + topic_offset,
        )
        for lesson_position, lesson_in in enumerate(topic_in.lessons, start=1):
            lesson = LessonModel(
                course_id=course_id,
                title=lesson_in.title,
                lesson_type=lesson_in.lesson_type,
                position=lesson_position,
                body=lesson_in.body,
                video_url=lesson_in.video_url,
                duration_seconds=(
                    lesson_in.duration_minutes * 60
                    if lesson_in.duration_minutes
                    else None
                ),
            )
            for question_position, question_in in enumerate(lesson_in.questions, start=1):
                question = QuestionModel(
                    prompt=question_in.prompt,
                    position=question_position,
                )
                for option_position, option_in in enumerate(question_in.options, start=1):
                    question.options.append(
                        AnswerOptionModel(
                            text=option_in.text,
                            is_correct=option_in.is_correct,
                            position=option_position,
                        )
                    )
                lesson.questions.append(question)
                questions_created += 1
            topic.lessons.append(lesson)
            lessons_created += 1
        db.add(topic)

    try:
        db.flush()
        recalc_course_duration(db, course_id)
        db.commit()
    except Exception as e:
        db.rollback()
        raise http_error(500, "database_error", error=str(e)) from e

    db.refresh(course)
    return CurriculumImportResultSchema(
        topics_created=len(payload.topics),
        lessons_created=lessons_created,
        questions_created=questions_created,
        course_duration_seconds=course.duration_seconds,
    )
