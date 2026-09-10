"""Tests de integración con base de datos: usan una sesión SQLAlchemy real
(SQLite en memoria, ver conftest.py) en vez de mocks, para comprobar que las
queries, los recálculos agregados y las cascadas de borrado funcionan de
verdad contra una base de datos.

    cd backend
    uv run pytest ../test/test_integration_db.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from modules.enrollments.model import EnrollmentStatus
from modules.lessons.model import LessonType
from modules.lessons.schema import LessonCreateSchema
from modules.lessons.service import create_lesson, delete_lesson
from modules.progress.service import complete_lesson
from modules.users.model import UserRole

from conftest import make_course, make_enrollment, make_lesson, make_user


def test_completing_all_lessons_marks_enrollment_completed(db):
    # Un curso con 2 lecciones: al completar la primera el progreso debe
    # quedar en 50%; al completar la segunda debe llegar a 100% y la
    # matrícula debe pasar a estado COMPLETED con completed_at fijado.
    student = make_user(db, name="student1", role=UserRole.STUDENT)
    course = make_course(db, title="Curso con dos lecciones")
    lesson1 = make_lesson(db, course, title="Lección 1", position=1)
    lesson2 = make_lesson(db, course, title="Lección 2", position=2)
    enrollment = make_enrollment(db, student, course)

    _, enrollment_after_first, passed1, _ = complete_lesson(db, student.id, lesson1.id)
    assert passed1 is True
    assert enrollment_after_first.progress_percent == 50.0
    assert enrollment_after_first.status == EnrollmentStatus.IN_PROGRESS

    _, enrollment_after_second, passed2, _ = complete_lesson(db, student.id, lesson2.id)
    assert passed2 is True
    assert enrollment_after_second.progress_percent == 100.0
    assert enrollment_after_second.status == EnrollmentStatus.COMPLETED
    assert enrollment_after_second.completed_at is not None

    db.refresh(enrollment)
    assert enrollment.completed_lessons_count == 2


def test_deleting_course_cascades_to_lessons_and_enrollments(db):
    # Al borrar un curso, sus lecciones (cascada ORM) y sus matrículas
    # (cascada a nivel de base de datos, `ondelete="CASCADE"`) deben
    # desaparecer también, sin dejar filas huérfanas.
    from modules.courses.model import CourseModel
    from modules.enrollments.model import EnrollmentModel
    from modules.lessons.model import LessonModel

    student = make_user(db, name="student2", role=UserRole.STUDENT)
    course = make_course(db, title="Curso a borrar")
    make_lesson(db, course, title="Única lección", position=1)
    make_enrollment(db, student, course)

    db.delete(db.query(CourseModel).filter(CourseModel.id == course.id).first())
    db.commit()

    assert db.query(CourseModel).filter(CourseModel.id == course.id).first() is None
    assert db.query(LessonModel).filter(LessonModel.course_id == course.id).count() == 0
    assert (
        db.query(EnrollmentModel).filter(EnrollmentModel.course_id == course.id).count() == 0
    )


def test_adding_lesson_recalcs_completed_enrollment(db):
    student = make_user(db, name="recalc_add", role=UserRole.STUDENT)
    course = make_course(db, title="Curso recalc add")
    lesson1 = make_lesson(db, course, title="Lección 1", position=1)
    lesson2 = make_lesson(db, course, title="Lección 2", position=2)
    enrollment = make_enrollment(db, student, course)

    complete_lesson(db, student.id, lesson1.id)
    _, enrollment_done, _, _ = complete_lesson(db, student.id, lesson2.id)
    assert enrollment_done.status == EnrollmentStatus.COMPLETED
    assert enrollment_done.progress_percent == 100.0

    create_lesson(
        db,
        course.id,
        LessonCreateSchema(
            title="Lección 3",
            lesson_type=LessonType.TEXT,
            topic_id=lesson1.topic_id,
            position=3,
        ),
    )

    db.refresh(enrollment)
    assert enrollment.status == EnrollmentStatus.IN_PROGRESS
    assert enrollment.completed_at is None
    assert abs(enrollment.progress_percent - 66.66666666666666) < 0.01
    assert enrollment.completed_lessons_count == 2


def test_deleting_lesson_recalcs_enrollment_to_completed(db):
    student = make_user(db, name="recalc_del", role=UserRole.STUDENT)
    course = make_course(db, title="Curso recalc del")
    lesson1 = make_lesson(db, course, title="Lección 1", position=1)
    lesson2 = make_lesson(db, course, title="Lección 2", position=2)
    enrollment = make_enrollment(db, student, course)

    complete_lesson(db, student.id, lesson1.id)
    db.refresh(enrollment)
    assert enrollment.progress_percent == 50.0
    assert enrollment.status == EnrollmentStatus.IN_PROGRESS

    delete_lesson(db, lesson2.id)

    db.refresh(enrollment)
    assert enrollment.progress_percent == 100.0
    assert enrollment.status == EnrollmentStatus.COMPLETED
    assert enrollment.completed_at is not None
    assert enrollment.completed_lessons_count == 1


def test_recomendador_colaborativo_ignora_a_los_usuarios_sin_cursos_en_comun(db):
    """El mapa de matrículas solo carga a los vecinos del usuario objetivo.

    Es equivalente a cargarlos a todos, no una aproximación: quien no comparte
    ningún curso tiene vectores disjuntos, así que su similitud coseno es
    exactamente 0 y `_score_collaborative_candidates` ya lo descartaba. Este
    test lo comprueba sobre datos reales: el usuario ajeno no aparece en el
    mapa y sus cursos no se cuelan entre las recomendaciones.
    """
    from modules.recommendations.aux_collaborative import (
        build_weighted_enrollment_map,
        collaborative_course_scores,
    )

    objetivo = make_user(db, name="objetivo", role=UserRole.STUDENT)
    vecino = make_user(db, name="vecino", role=UserRole.STUDENT)
    ajeno = make_user(db, name="ajeno", role=UserRole.STUDENT)

    compartido = make_course(db, title="Compartido")
    solo_vecino = make_course(db, title="Solo del vecino")
    solo_ajeno = make_course(db, title="Solo del ajeno")

    make_enrollment(db, objetivo, compartido)
    make_enrollment(db, vecino, compartido)
    make_enrollment(db, vecino, solo_vecino)
    make_enrollment(db, ajeno, solo_ajeno)

    mapa = build_weighted_enrollment_map(db, objetivo.id)

    # El vecino entra porque comparte curso; el ajeno ni siquiera se carga.
    assert set(mapa) == {objetivo.id, vecino.id}

    scores = collaborative_course_scores(db, objetivo.id, excluded={compartido.id})

    # Se recomienda el curso del vecino, nunca el del usuario sin nada en común.
    assert solo_vecino.id in scores
    assert solo_ajeno.id not in scores
