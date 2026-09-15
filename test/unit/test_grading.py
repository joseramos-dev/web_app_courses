"""Tests unitarios de la autocorrección de tests/quizzes (`_grade_test`):
una pregunta cuenta como acierto solo si se marca exactamente el conjunto de
opciones correctas, ni de más ni de menos. Usan la fixture `db` para crear
preguntas y opciones reales, pero llaman al servicio directamente.

    cd backend
    uv run pytest ../test/unit/test_grading.py -v
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from conftest import make_course, make_lesson

from modules.lessons.model import AnswerOptionModel, LessonType, QuestionModel
from modules.lessons.schema import LessonAnswerSchema
from modules.progress.service import _grade_test


def _quiz_lesson(db: Session):
    course = make_course(db)
    return make_lesson(db, course, title="Quiz", lesson_type=LessonType.TEST)


def _add_question(db: Session, lesson, *, position: int, correct_positions: set[int]) -> QuestionModel:
    """Crea una pregunta con 4 opciones; `correct_positions` (1..4) marca
    cuáles son correctas."""
    question = QuestionModel(lesson_id=lesson.id, prompt=f"Pregunta {position}", position=position)
    db.add(question)
    db.commit()
    db.refresh(question)

    for i in range(1, 5):
        db.add(
            AnswerOptionModel(
                question_id=question.id,
                text=f"Opción {i}",
                is_correct=i in correct_positions,
                position=i,
            )
        )
    db.commit()
    db.refresh(question)
    return question


def test_sin_preguntas_configuradas_se_considera_aprobado(db: Session):
    """Documentado en el propio código: una lección de test sin preguntas no
    debe bloquear al alumno."""
    lesson = _quiz_lesson(db)
    assert _grade_test(db, lesson, []) == 100.0


def test_marcar_exactamente_las_opciones_correctas_cuenta_como_acierto(db: Session):
    lesson = _quiz_lesson(db)
    q = _add_question(db, lesson, position=1, correct_positions={2, 3})
    correct_ids = [o.id for o in q.options if o.is_correct]

    answers = [LessonAnswerSchema(question_id=q.id, selected_option_ids=correct_ids)]
    assert _grade_test(db, lesson, answers) == 100.0


def test_falta_una_opcion_correcta_cuenta_como_fallo(db: Session):
    lesson = _quiz_lesson(db)
    q = _add_question(db, lesson, position=1, correct_positions={2, 3})
    correct_ids = [o.id for o in q.options if o.is_correct]

    answers = [LessonAnswerSchema(question_id=q.id, selected_option_ids=correct_ids[:1])]
    assert _grade_test(db, lesson, answers) == 0.0


def test_marcar_una_opcion_incorrecta_de_mas_cuenta_como_fallo(db: Session):
    lesson = _quiz_lesson(db)
    q = _add_question(db, lesson, position=1, correct_positions={2})
    correct_ids = [o.id for o in q.options if o.is_correct]
    wrong_id = next(o.id for o in q.options if not o.is_correct)

    answers = [
        LessonAnswerSchema(question_id=q.id, selected_option_ids=correct_ids + [wrong_id])
    ]
    assert _grade_test(db, lesson, answers) == 0.0


def test_no_responder_una_pregunta_cuenta_como_fallo(db: Session):
    lesson = _quiz_lesson(db)
    _add_question(db, lesson, position=1, correct_positions={1})

    assert _grade_test(db, lesson, []) == 0.0


def test_la_nota_es_el_porcentaje_de_preguntas_acertadas(db: Session):
    lesson = _quiz_lesson(db)
    q1 = _add_question(db, lesson, position=1, correct_positions={1})
    q2 = _add_question(db, lesson, position=2, correct_positions={2})
    q1_correct = [o.id for o in q1.options if o.is_correct]
    q2_wrong = [o.id for o in q2.options if not o.is_correct][:1]

    answers = [
        LessonAnswerSchema(question_id=q1.id, selected_option_ids=q1_correct),
        LessonAnswerSchema(question_id=q2.id, selected_option_ids=q2_wrong),
    ]
    assert _grade_test(db, lesson, answers) == 50.0
