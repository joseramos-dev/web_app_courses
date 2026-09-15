"""Tests unitarios del guardián de permisos sobre cursos
(`assert_can_manage_course`): quién puede gestionar qué curso según su rol.
Usan la fixture `db` (SQLite en memoria) para poder crear usuarios y cursos
reales, pero llaman al servicio directamente, sin pasar por HTTP.

    cd backend
    uv run pytest ../test/unit/test_course_permissions.py -v
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from conftest import make_course, make_user

from modules.courses.instructor_service import assert_can_manage_course
from modules.users.model import UserRole


def test_el_admin_puede_gestionar_cualquier_curso(db: Session):
    instructor = make_user(db, name="profe", role=UserRole.INSTRUCTOR)
    admin = make_user(db, name="admin", role=UserRole.ADMIN)
    course = make_course(db, instructor_id=instructor.id)

    assert assert_can_manage_course(db, course.id, admin).id == course.id


def test_el_instructor_dueno_del_curso_puede_gestionarlo(db: Session):
    instructor = make_user(db, name="profe", role=UserRole.INSTRUCTOR)
    course = make_course(db, instructor_id=instructor.id)

    assert assert_can_manage_course(db, course.id, instructor).id == course.id


def test_un_instructor_no_puede_gestionar_el_curso_de_otro(db: Session):
    dueno = make_user(db, name="profe1", role=UserRole.INSTRUCTOR)
    otro = make_user(db, name="profe2", role=UserRole.INSTRUCTOR)
    course = make_course(db, instructor_id=dueno.id)

    with pytest.raises(HTTPException) as exc_info:
        assert_can_manage_course(db, course.id, otro)
    assert exc_info.value.status_code == 403


def test_un_estudiante_no_puede_gestionar_cursos(db: Session):
    instructor = make_user(db, name="profe", role=UserRole.INSTRUCTOR)
    student = make_user(db, name="alumno", role=UserRole.STUDENT)
    course = make_course(db, instructor_id=instructor.id)

    with pytest.raises(HTTPException) as exc_info:
        assert_can_manage_course(db, course.id, student)
    assert exc_info.value.status_code == 403


def test_un_curso_inexistente_da_404(db: Session):
    admin = make_user(db, name="admin", role=UserRole.ADMIN)

    with pytest.raises(HTTPException) as exc_info:
        assert_can_manage_course(db, 999999, admin)
    assert exc_info.value.status_code == 404
