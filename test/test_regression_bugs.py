"""Tests de regresión: uno por cada bug ya corregido en el código, para que
si alguien lo reintroduce por error en el futuro, la suite falle en vez de
descubrirlo en producción.

    cd backend
    uv run pytest ../test/test_regression_bugs.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from core.config import ENABLE_DEV_ROUTES
from modules.progress.service import _get_or_create_lesson_progress
from modules.users.model import UserRole

from conftest import auth_headers, make_user


def test_admin_cannot_change_own_role(client, db):
    # Bug corregido: un admin podía quitarse a sí mismo el rol de admin
    # mediante PATCH /users/{id}/role/{role}, quedándose sin poder revertirlo.
    # El endpoint rechaza ahora *cualquier* cambio sobre uno mismo, incluido
    # reasignarse el rol que ya tiene: aunque parezca inocuo, dispararía los
    # efectos del cambio de rol.
    admin = make_user(db, name="self_admin", password="secret123", role=UserRole.ADMIN)
    headers = auth_headers(client, "self_admin", "secret123")

    for role in ("student", "instructor", "admin"):
        resp = client.patch(f"/users/{admin.id}/role/{role}", headers=headers)
        assert resp.status_code == 403, role
        assert resp.json()["detail"] == "No puedes cambiar tu propio rol"

    db.refresh(admin)
    assert admin.role == UserRole.ADMIN


@pytest.mark.skipif(
    not ENABLE_DEV_ROUTES,
    reason="/users/bootstrap_admin solo existe cuando ENABLE_DEV_ROUTES está activo",
)
def test_bootstrap_admin_promotes_existing_user_named_admin(client, db):
    # Bug corregido: si ya existía un usuario llamado "admin" (sin rol
    # admin), bootstrap_admin fallaba en vez de promoverlo. Ahora debe
    # reutilizar esa cuenta y asignarle el rol de admin.
    existing = make_user(
        db, name="admin", email="admin@admin", password="admin", role=UserRole.STUDENT
    )

    resp = client.post("/users/bootstrap_admin")

    assert resp.status_code == 200
    assert resp.json()["detail"] == "Usuario existente promovido a administrador"

    db.refresh(existing)
    assert existing.role == UserRole.ADMIN


def test_lesson_progress_race_condition_falls_back_to_existing_row(mocker):
    # Bug corregido: si dos peticiones "empezar lección" llegaban casi a la
    # vez, ambas intentaban crear la misma fila de progreso; la segunda
    # lanzaba IntegrityError (violación del UNIQUE enrollment+lesson) y el
    # error se propagaba como un 500 al cliente. Ahora debe capturarse y
    # devolver la fila que la otra petición ya creó.
    existing_row = SimpleNamespace(id=1, enrollment_id=10, lesson_id=20)

    db = mocker.Mock()
    query_mock = mocker.Mock()
    query_mock.filter.return_value = query_mock
    # 1ª consulta (comprobación inicial): no existe todavía -> None.
    # 2ª consulta (tras capturar el IntegrityError): ya la creó la otra
    # petición concurrente -> se recupera esa fila.
    query_mock.first.side_effect = [None, existing_row]
    db.query.return_value = query_mock

    # `with db.begin_nested():` es un context manager; simulamos que el
    # flush() dentro de ese bloque lanza IntegrityError.
    nested_cm = mocker.MagicMock()
    nested_cm.__enter__.side_effect = IntegrityError("INSERT", {}, Exception("duplicate"))
    db.begin_nested.return_value = nested_cm

    result = _get_or_create_lesson_progress(db, enrollment_id=10, lesson_id=20)

    assert result is existing_row
