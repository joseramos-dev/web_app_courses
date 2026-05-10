from sqlalchemy.orm import Session
from modules.lessons.model import (
    LessonModel,
    QuestionModel,
    AnswerOptionModel,
)
from modules.lessons.schema import (
    LessonCreateSchema,
    LessonUpdateSchema,
    QuestionCreateSchema,
    QuestionUpdateSchema,
)


def get_lessons(db: Session):
    return db.query(LessonModel).all()


def get_lessons_by_course(db: Session, course_id: int):
    return (
        db.query(LessonModel)
        .filter(LessonModel.course_id == course_id)
        .order_by(LessonModel.position.asc())
        .all()
    )


def create_lesson(db: Session, course_id: int, lesson: LessonCreateSchema):
    new_lesson = LessonModel(
        course_id=course_id,
        title=lesson.title,
        lesson_type=lesson.lesson_type,
        position=lesson.position,
        body=lesson.body,
        video_url=lesson.video_url,
    )
    db.add(new_lesson)
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
    db.commit()
    db.refresh(lesson)
    return lesson


def delete_lesson(db: Session, lesson_id: int):
    lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if not lesson:
        return None
    db.delete(lesson)
    db.commit()
    return True


def reorder_lessons(db: Session, course_id: int, ordered_lesson_ids: list[int]):
    lessons = get_lessons_by_course(db, course_id)
    by_id = {l.id: l for l in lessons}
    if set(by_id.keys()) != set(ordered_lesson_ids):
        return None

    # The `(course_id, position)` UNIQUE constraint is enforced row-by-row
    # (Postgres only defers it when declared DEFERRABLE), so a naive
    # in-place reassignment fails the moment two lessons swap places. We
    # work around it with a two-phase update: first negate every position
    # so the rows hold non-conflicting placeholders, flush, and then write
    # the final positive positions. The negatives are guaranteed unique
    # among themselves because the original positions were.
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


def create_question(db: Session, lesson_id: int, payload: QuestionCreateSchema):
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
