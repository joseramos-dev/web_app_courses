from types import SimpleNamespace

from sqlalchemy import func
from sqlalchemy.orm import Session
from modules.courses.model import CourseModel
from core.i18n import http_error
from modules.lessons.model import (
    LessonModel,
    LessonType,
    QuestionModel,
    AnswerOptionModel,
)
from modules.lessons.schema import (
    LessonCreateSchema,
    LessonSchema,
    LessonUpdateSchema,
    QuestionCreateSchema,
    QuestionUpdateSchema,
)
from modules.notifications.service import (
    notify_lesson_removed_to_enrolled,
    notify_new_lesson_to_enrolled,
)
from modules.progress.access_service import get_unlocked_lesson_ids
from modules.progress.service import recalc_course_enrollments_progress
from modules.topics.model import TopicModel


def redact_locked_lessons(
    db: Session,
    course: CourseModel,
    lessons,
    user,
    unlocked: set[int] | None = None,
) -> list[LessonSchema]:
    """Return LessonSchema copies with the body/video_url of every lesson the
    caller has not unlocked blanked out.

    Listing endpoints expose the syllabus (title, type, position) to anyone who
    can see the course, but the actual material only to whoever is entitled to
    it: course staff, and students enrolled far enough in a progressive course.
    `get_unlocked_lesson_ids` already encodes all of those rules and returns an
    empty set for anonymous or non-enrolled callers.

    Pass `unlocked` when redacting several batches of lessons of the same course
    (e.g. one per curriculum topic) so the unlock set is only computed once.

    We build Pydantic copies on purpose. Blanking the fields on the LessonModel
    instances would stage the change on the ORM session and a later flush would
    wipe the lesson content from the database.
    """
    if unlocked is None:
        unlocked = get_unlocked_lesson_ids(db, course, user)
    redacted: list[LessonSchema] = []
    for lesson in lessons:
        item = LessonSchema.model_validate(lesson, from_attributes=True)
        if lesson.id not in unlocked:
            item.body = None
            item.video_url = None
        redacted.append(item)
    return redacted


def get_lessons_by_course(db: Session, course_id: int):
    return (
        db.query(LessonModel)
        .join(TopicModel, LessonModel.topic_id == TopicModel.id)
        .filter(LessonModel.course_id == course_id)
        .order_by(TopicModel.position.asc(), LessonModel.position.asc())
        .all()
    )


def recalc_course_duration(db: Session, course_id: int) -> None:
    """Store the course duration as the sum of its lessons' declared durations.

    Denormalized onto `courses.duration_seconds` because the catalogue filters
    and sorts by it over thousands of rows, where a correlated SUM would be
    expensive. Topic durations are not stored: they are summed from lessons
    already loaded with the curriculum.

    Only called when a lesson is created, updated or deleted, which is what
    keeps the imported catalogue safe: those courses have no lessons, so their
    duration is never recomputed.
    """
    total = (
        db.query(func.coalesce(func.sum(LessonModel.duration_seconds), 0))
        .filter(LessonModel.course_id == course_id)
        .scalar()
    )
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if course is None:
        return
    # None rather than 0 when nothing is declared: the catalogue filter treats
    # 0 as "no duration", and a stored 0 would be indistinguishable from a
    # course whose lessons genuinely add up to nothing.
    course.duration_seconds = int(total) or None
    db.add(course)
    db.flush()


def create_lesson(db: Session, course_id: int, lesson: LessonCreateSchema):
    new_lesson = LessonModel(
        course_id=course_id,
        topic_id=lesson.topic_id,
        title=lesson.title,
        lesson_type=lesson.lesson_type,
        position=lesson.position,
        body=lesson.body,
        video_url=lesson.video_url,
        duration_seconds=lesson.duration_seconds,
        max_score=lesson.max_score,
        passing_score=lesson.passing_score,
        allows_file_submission=lesson.allows_file_submission,
    )
    db.add(new_lesson)
    db.flush()
    recalc_course_enrollments_progress(db, course_id)
    recalc_course_duration(db, course_id)
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    if course:
        notify_new_lesson_to_enrolled(
            db,
            course_id=course_id,
            lesson_id=new_lesson.id,
            lesson_title=new_lesson.title,
            course_title=course.title,
        )
    db.commit()
    db.refresh(new_lesson)
    return new_lesson


def update_lesson(db: Session, lesson_id: int, payload: LessonUpdateSchema):
    lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if not lesson:
        return None
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(lesson, k, v)
    db.add(lesson)
    db.flush()
    recalc_course_duration(db, lesson.course_id)
    db.commit()
    db.refresh(lesson)
    return lesson


def delete_lesson(db: Session, lesson_id: int):
    lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if not lesson:
        return None
    course_id = lesson.course_id
    lesson_title = lesson.title
    course = db.query(CourseModel).filter(CourseModel.id == course_id).first()
    course_title = course.title if course else ""
    db.delete(lesson)
    db.flush()
    recalc_course_enrollments_progress(db, course_id)
    recalc_course_duration(db, course_id)
    if course:
        notify_lesson_removed_to_enrolled(
            db,
            course_id=course_id,
            lesson_title=lesson_title,
            course_title=course_title,
        )
    db.commit()
    return True


def reorder_lessons(db: Session, course_id: int, ordered_lesson_ids: list[int]):
    lessons = get_lessons_by_course(db, course_id)
    by_id = {l.id: l for l in lessons}
    if set(by_id.keys()) != set(ordered_lesson_ids):
        return None
    for lesson in lessons:
        lesson.position = -lesson.position
    db.flush()

    for idx, lesson_id in enumerate(ordered_lesson_ids, start=1):
        by_id[lesson_id].position = idx

    db.commit()
    return get_lessons_by_course(db, course_id)


# ---------- Questions ----------

def get_questions_by_lesson(db: Session, lesson_id: int):
    return (
        db.query(QuestionModel)
        .filter(QuestionModel.lesson_id == lesson_id)
        .order_by(QuestionModel.position.asc())
        .all()
    )


def _assert_valid_answer_key(lesson_type: LessonType, options) -> None:
    """Reject an answer key the student could never match.

    `_grade_test` marks a question right only when the selected options are
    exactly the ones flagged correct, and the player renders a TEST question as
    radio buttons, so the student can pick just one. A TEST question with two
    correct options is therefore impossible to answer right, and one with none
    is impossible for every type.
    """
    correct = sum(1 for opt in options if getattr(opt, "is_correct", False))
    if lesson_type == LessonType.TEST and correct != 1:
        raise http_error(400, "test_needs_one_correct")
    if lesson_type == LessonType.MULTIPLE_SELECTION and correct < 2:
        raise http_error(400, "multiple_needs_two_correct")
    if correct == 0:
        raise http_error(400, "question_needs_correct_option")


def create_question(db: Session, lesson_id: int, payload: QuestionCreateSchema):
    lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if not lesson:
        raise http_error(404, "lesson_not_found")
    _assert_valid_answer_key(lesson.lesson_type, payload.options)

    question = QuestionModel(
        lesson_id=lesson_id,
        prompt=payload.prompt,
        position=payload.position,
    )
    for opt in payload.options:
        question.options.append(
            AnswerOptionModel(
                text=opt.text,
                is_correct=opt.is_correct,
                position=opt.position,
            )
        )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def update_question(db: Session, question_id: int, payload: QuestionUpdateSchema):
    question = (
        db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
    )
    if not question:
        return None
    data = payload.model_dump(exclude_unset=True)
    new_options = data.pop("options", None)
    for k, v in data.items():
        setattr(question, k, v)
    if new_options is not None:
        lesson = (
            db.query(LessonModel).filter(LessonModel.id == question.lesson_id).first()
        )
        if lesson:
            _assert_valid_answer_key(
                lesson.lesson_type,
                [SimpleNamespace(**opt) for opt in new_options],
            )
        # Replace options atomically: clear & re-add.
        question.options.clear()
        db.flush()
        for opt in new_options:
            question.options.append(
                AnswerOptionModel(
                    text=opt["text"],
                    is_correct=opt.get("is_correct", False),
                    position=opt["position"],
                )
            )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question_id: int):
    question = (
        db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
    )
    if not question:
        return None
    db.delete(question)
    db.commit()
    return True
