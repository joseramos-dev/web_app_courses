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
