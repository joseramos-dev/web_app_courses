"""Test unitario de regresión: condición de carrera al crear el progreso de
una lección. Movido aquí desde `test_regression_bugs.py` porque no toca base
de datos real ni HTTP (todo mockeado con `mocker`), a diferencia del resto
de tests de ese archivo.

    cd backend
    uv run pytest ../test/unit/test_progress_race_condition.py -v
"""

from __future__ import annotations

from types import SimpleNamespace

from sqlalchemy.exc import IntegrityError

from modules.progress.service import _get_or_create_lesson_progress


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
