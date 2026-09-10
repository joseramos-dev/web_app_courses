"""Tests de control de acceso al contenido de las lecciones y a las entregas.

Cubren dos agujeros corregidos:

1. Los endpoints de listado devolvían `body` / `video_url` de todas las
   lecciones a cualquiera, incluidos anónimos y alumnos que aún no habían
   llegado a esa lección en un curso progresivo.
2. Adjuntos del profesor y entregas de alumnos comparten la tabla
   `lesson_files`; sin distinguirlos, un alumno podía descargar la entrega
   de un compañero.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import (
    auth_headers,
    make_course,
    make_enrollment,
    make_lesson,
    make_user,
)

from modules.courses.model import LessonAccessMode
from modules.lessons.model import LessonType
from modules.users.model import UserRole


PDF = ("entrega.pdf", b"%PDF-1.4 contenido", "application/pdf")


@pytest.fixture(autouse=True)
def _uploads_in_tmp(tmp_path, monkeypatch):
    """Los ficheros subidos van a un directorio temporal, no a backend/uploads."""
    monkeypatch.setattr("modules.lessons.file_service.UPLOAD_DIR", tmp_path)


def _make_lesson_with_body(db: Session, course, *, position: int, body: str):
    lesson = make_lesson(db, course, title=f"Lección {position}", position=position)
    lesson.body = body
    db.commit()
    db.refresh(lesson)
    return lesson


def _lessons_from_curriculum(payload: dict) -> list[dict]:
    return [lesson for topic in payload["topics"] for lesson in topic["lessons"]]


# ---------- 1. Endpoints de listado ----------

def test_listado_global_de_lecciones_ya_no_existe(client: TestClient):
    """`GET /lessons/` devolvía toda la tabla sin autenticación. Se eliminó."""
    assert client.get("/lessons/").status_code == 404


def test_lecciones_por_curso_exige_autenticacion(client: TestClient, db: Session):
    course = make_course(db)
    _make_lesson_with_body(db, course, position=1, body="contenido secreto")

    assert client.get(f"/lessons/course/{course.id}").status_code == 401


def test_anonimo_ve_el_temario_pero_no_el_contenido(client: TestClient, db: Session):
    course = make_course(db)
    _make_lesson_with_body(db, course, position=1, body="contenido secreto")

    resp = client.get(f"/courses/{course.id}/curriculum")
    assert resp.status_code == 200

    lessons = _lessons_from_curriculum(resp.json())
    assert [lesson["title"] for lesson in lessons] == ["Lección 1"]
    assert lessons[0]["body"] is None
    assert lessons[0]["video_url"] is None


def test_la_redaccion_no_borra_el_contenido_de_la_base_de_datos(
    client: TestClient, db: Session
):
    """La redacción construye copias Pydantic a propósito. Si en su lugar se
    vaciaran los campos sobre la instancia LessonModel, el siguiente flush de
    la sesión borraría el contenido real de la lección."""
    course = make_course(db)
    lesson = _make_lesson_with_body(db, course, position=1, body="contenido secreto")

    assert client.get(f"/courses/{course.id}/curriculum").status_code == 200

    db.expire_all()
    assert db.get(type(lesson), lesson.id).body == "contenido secreto"


def test_alumno_en_curso_progresivo_solo_ve_el_contenido_alcanzado(
    client: TestClient, db: Session
):
    course = make_course(db)
    course.lesson_access_mode = LessonAccessMode.PROGRESSIVE
    db.commit()
    for position in (1, 2, 3):
        _make_lesson_with_body(db, course, position=position, body=f"cuerpo {position}")

    student = make_user(db, name="alumna", role=UserRole.STUDENT)
    make_enrollment(db, student, course)
    headers = auth_headers(client, "alumna", "secret123")

    resp = client.get(f"/courses/{course.id}/curriculum", headers=headers)
    assert resp.status_code == 200

    bodies = [lesson["body"] for lesson in _lessons_from_curriculum(resp.json())]
    # Solo la primera está desbloqueada: aún no ha completado ninguna.
    assert bodies == ["cuerpo 1", None, None]


def test_instructor_propietario_ve_todo_el_contenido(client: TestClient, db: Session):
    instructor = make_user(db, name="profe", role=UserRole.INSTRUCTOR)
    course = make_course(db, instructor_id=instructor.id)
    course.lesson_access_mode = LessonAccessMode.PROGRESSIVE
    db.commit()
    for position in (1, 2):
        _make_lesson_with_body(db, course, position=position, body=f"cuerpo {position}")

    headers = auth_headers(client, "profe", "secret123")
    resp = client.get(f"/courses/{course.id}/curriculum", headers=headers)

    bodies = [lesson["body"] for lesson in _lessons_from_curriculum(resp.json())]
    assert bodies == ["cuerpo 1", "cuerpo 2"]


# ---------- 2. Aislamiento de las entregas ----------

@pytest.fixture()
def assignment_setup(client: TestClient, db: Session):
    """Curso con una tarea, su instructor y dos alumnos matriculados.

    La alumna A sube una entrega; devolvemos el id del fichero resultante.
    """
    instructor = make_user(db, name="profe", role=UserRole.INSTRUCTOR)
    course = make_course(db, instructor_id=instructor.id)
    lesson = make_lesson(
        db, course, title="Tarea", position=1, lesson_type=LessonType.ASSIGNMENT
    )

    alumna_a = make_user(db, name="alumna_a", role=UserRole.STUDENT)
    alumno_b = make_user(db, name="alumno_b", role=UserRole.STUDENT)
    make_enrollment(db, alumna_a, course)
    make_enrollment(db, alumno_b, course)

    headers_a = auth_headers(client, "alumna_a", "secret123")
    resp = client.post(
        f"/lessons/{lesson.id}/submission-files",
        files={"file": PDF},
        headers=headers_a,
    )
    assert resp.status_code == 201, resp.text

    return {
        "course": course,
        "lesson": lesson,
        "file_id": resp.json()["id"],
        "headers_a": headers_a,
        "headers_b": auth_headers(client, "alumno_b", "secret123"),
        "headers_instructor": auth_headers(client, "profe", "secret123"),
    }


def test_un_alumno_no_puede_descargar_la_entrega_de_otro(
    client: TestClient, assignment_setup
):
    resp = client.get(
        f"/lessons/files/{assignment_setup['file_id']}/download",
        headers=assignment_setup["headers_b"],
    )
    assert resp.status_code == 403


def test_el_autor_y_el_instructor_si_pueden_descargar_la_entrega(
    client: TestClient, assignment_setup
):
    file_id = assignment_setup["file_id"]

    propia = client.get(
        f"/lessons/files/{file_id}/download", headers=assignment_setup["headers_a"]
    )
    assert propia.status_code == 200

    del_profesor = client.get(
        f"/lessons/files/{file_id}/download",
        headers=assignment_setup["headers_instructor"],
    )
    assert del_profesor.status_code == 200


def test_las_entregas_no_aparecen_en_los_adjuntos_de_la_leccion(
    client: TestClient, assignment_setup
):
    lesson_id = assignment_setup["lesson"].id

    for who in ("headers_a", "headers_b", "headers_instructor"):
        resp = client.get(
            f"/lessons/{lesson_id}/files", headers=assignment_setup[who]
        )
        assert resp.status_code == 200
        assert resp.json() == [], f"la entrega se filtró en el listado de {who}"


# ---------- 3. Regresión: cursos privados ----------

def test_el_instructor_puede_subir_ficheros_a_su_curso_privado(
    client: TestClient, db: Session
):
    """`get_course_detail` se llamaba sin `user=`, así que un curso privado
    devolvía 404 incluso a su propio instructor."""
    instructor = make_user(db, name="profe", role=UserRole.INSTRUCTOR)
    course = make_course(db, instructor_id=instructor.id)
    course.is_public = False
    db.commit()
    lesson = make_lesson(db, course, title="Tema oculto", position=1)

    headers = auth_headers(client, "profe", "secret123")
    resp = client.post(
        f"/lessons/{lesson.id}/files",
        files={"file": ("apuntes.pdf", b"%PDF-1.4 apuntes", "application/pdf")},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
