"""Tests de API end-to-end: llaman a los endpoints reales de FastAPI con
`TestClient` (petición HTTP -> router -> service -> BD SQLite en memoria),
comprobando status codes, contratos de los esquemas y permisos por rol tal
y como los vería un cliente real (frontend, Postman, etc.).

    cd backend
    uv run pytest ../test/test_api_auth.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from modules.auth.service import MAX_LOGIN_ATTEMPTS
from modules.users.model import UserModel, UserRole

from conftest import auth_headers, make_user


def test_register_login_and_me_flow(client):
    # Flujo completo de un usuario nuevo: registro público, login con esas
    # credenciales (form-urlencoded, como exige OAuth2PasswordRequestForm)
    # y lectura de /me con el token obtenido.
    register_resp = client.post(
        "/users/",
        json={
            "name": "new_student",
            "email": "new_student@example.com",
            "password": "secret123",
            "role": "student",
        },
    )
    assert register_resp.status_code == 201

    login_resp = client.post(
        "/token",
        data={"username": "new_student", "password": "secret123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    me_resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["name"] == "new_student"


def test_login_with_wrong_password_returns_401(client, db):
    # Una contraseña incorrecta debe rechazarse con 401 y no debe emitir
    # ningún token de acceso.
    make_user(db, name="wronged_user", password="correct-password")

    resp = client.post(
        "/token",
        data={"username": "wronged_user", "password": "incorrect-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Credenciales inválidas"


def test_account_locks_after_max_failed_attempts(client, db):
    # Tras encadenar MAX_LOGIN_ATTEMPTS intentos fallidos, la cuenta debe
    # bloquearse (423) aunque el siguiente intento use la contraseña
    # correcta: el bloqueo es temporal y no depende de acertar la clave.
    make_user(db, name="lockout_user", password="correct-password")

    for _ in range(MAX_LOGIN_ATTEMPTS):
        resp = client.post(
            "/token",
            data={"username": "lockout_user", "password": "wrong"},
        )
    assert resp.status_code == 423

    resp_after_lock = client.post(
        "/token",
        data={"username": "lockout_user", "password": "correct-password"},
    )
    assert resp_after_lock.status_code == 423


def test_successful_login_resets_failed_attempts_counter(client, db):
    # Un login correcto debe resetear el contador de intentos fallidos, de
    # forma que un fallo posterior aislado no acumule sobre intentos
    # antiguos ya "perdonados" por un login exitoso.
    make_user(db, name="recovering_user", password="correct-password")

    for _ in range(MAX_LOGIN_ATTEMPTS - 1):
        client.post(
            "/token",
            data={"username": "recovering_user", "password": "wrong"},
        )

    ok_resp = client.post(
        "/token",
        data={"username": "recovering_user", "password": "correct-password"},
    )
    assert ok_resp.status_code == 200

    user = db.query(UserModel).filter(UserModel.name == "recovering_user").first()
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_role_protected_endpoint_rejects_non_admin_but_allows_admin(client, db):
    # GET /users/ está protegido con require_role(["admin"]): un estudiante
    # debe recibir 403, mientras que un admin autenticado debe poder verlo.
    make_user(db, name="plain_student", password="secret123", role=UserRole.STUDENT)
    make_user(db, name="the_admin", password="secret123", role=UserRole.ADMIN)

    student_headers = auth_headers(client, "plain_student", "secret123")
    forbidden_resp = client.get("/users/", headers=student_headers)
    assert forbidden_resp.status_code == 403

    admin_headers = auth_headers(client, "the_admin", "secret123")
    ok_resp = client.get("/users/", headers=admin_headers)
    assert ok_resp.status_code == 200
    assert any(u["name"] == "plain_student" for u in ok_resp.json())
