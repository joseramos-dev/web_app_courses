"""Tests del endurecimiento de la API: sesión por cookie, rate limiting,
cabeceras de seguridad y validación real de los ficheros subidos.

    cd backend
    uv run pytest ../test/test_api_security.py -v
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from conftest import auth_headers, make_course, make_lesson, make_user

from core.config import MAX_REQUEST_BYTES
from core.rate_limit import limiter
from modules.auth.model import RefreshTokenModel
from modules.auth.routes import REFRESH_COOKIE_NAME
from modules.users.model import UserRole


def _login(client: TestClient, name: str = "sessionuser", password: str = "secret123"):
    return client.post("/token", data={"username": name, "password": password})


# ---------- Sesión por cookie ----------

def test_login_devuelve_access_token_pero_nunca_el_refresh(client: TestClient, db: Session):
    """El refresh token no debe viajar en el cuerpo: si JavaScript puede
    leerlo, un XSS se lleva una sesión de 7 días."""
    make_user(db, name="sessionuser")

    resp = _login(client)
    assert resp.status_code == 200

    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" not in body


def test_login_deja_la_cookie_de_refresco_como_httponly(client: TestClient, db: Session):
    make_user(db, name="sessionuser")

    resp = _login(client)
    raw_cookie = resp.headers.get("set-cookie", "")

    assert REFRESH_COOKIE_NAME in raw_cookie
    assert "HttpOnly" in raw_cookie
    # Acotada a /token: no se envía al resto de la API.
    assert "Path=/token" in raw_cookie


def test_refresh_sin_cookie_es_401(client: TestClient):
    assert client.post("/token/refresh").status_code == 401


def test_refresh_con_cookie_renueva_y_rota(client: TestClient, db: Session):
    make_user(db, name="sessionuser")
    _login(client)  # el TestClient guarda la cookie automáticamente

    resp = client.post("/token/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    # La rotación revoca la fila anterior y emite una nueva.
    assert db.query(RefreshTokenModel).count() == 2
    revoked = (
        db.query(RefreshTokenModel)
        .filter(RefreshTokenModel.revoked_at.isnot(None))
        .count()
    )
    assert revoked == 1


def test_logout_revoca_el_token_y_borra_la_cookie(client: TestClient, db: Session):
    make_user(db, name="sessionuser")
    _login(client)

    resp = client.post("/token/logout")
    assert resp.status_code == 204

    row = db.query(RefreshTokenModel).first()
    assert row.revoked_at is not None
    assert client.post("/token/refresh").status_code == 401


# ---------- Rate limiting ----------

def test_el_login_repetido_acaba_devolviendo_429(client: TestClient, db: Session):
    """El bloqueo por cuenta no frena el password spraying (una contraseña
    contra muchos usuarios); el límite por IP sí."""
    make_user(db, name="sessionuser")

    limiter.enabled = True
    limiter.reset()
    try:
        statuses = [
            client.post(
                "/token", data={"username": f"nadie{i}", "password": "x"}
            ).status_code
            for i in range(12)
        ]
    finally:
        limiter.enabled = False
        limiter.reset()

    assert 429 in statuses, statuses
    assert statuses.index(429) >= 10, "el límite salta antes de 10/minute"


# ---------- Cabeceras de seguridad ----------

@pytest.mark.parametrize(
    "header,expected",
    [
        ("x-frame-options", "DENY"),
        ("x-content-type-options", "nosniff"),
        ("referrer-policy", "no-referrer"),
    ],
)
def test_toda_respuesta_lleva_las_cabeceras_de_seguridad(
    client: TestClient, header: str, expected: str
):
    resp = client.get("/")
    assert resp.headers.get(header) == expected


def test_la_api_lleva_csp_restrictivo_pero_swagger_no(client: TestClient):
    api_resp = client.get("/")
    assert "default-src 'none'" in api_resp.headers.get("content-security-policy", "")

    # Swagger carga scripts y estilos de un CDN: con el CSP de la API se vería
    # en blanco.
    docs_resp = client.get("/docs")
    assert docs_resp.status_code == 200
    assert docs_resp.headers.get("content-security-policy") is None


def test_content_length_excesivo_se_rechaza_con_413(client: TestClient):
    resp = client.post(
        "/token",
        content=b"x",
        headers={"content-length": str(MAX_REQUEST_BYTES + 1)},
    )
    assert resp.status_code == 413


# ---------- Validación de ficheros ----------

@pytest.fixture()
def upload_ctx(client: TestClient, db: Session, tmp_path, monkeypatch):
    monkeypatch.setattr("modules.lessons.file_service.UPLOAD_DIR", tmp_path)
    instructor = make_user(db, name="profe", role=UserRole.INSTRUCTOR)
    course = make_course(db, instructor_id=instructor.id)
    lesson = make_lesson(db, course, title="Tema", position=1)
    return lesson, auth_headers(client, "profe", "secret123")


def test_un_ejecutable_disfrazado_de_pdf_se_rechaza(client: TestClient, upload_ctx):
    """`Content-Type` lo controla el atacante; los magic bytes no."""
    lesson, headers = upload_ctx

    resp = client.post(
        f"/lessons/{lesson.id}/files",
        files={"file": ("inocente.pdf", b"MZ\x90\x00\x03 ejecutable", "application/pdf")},
        headers=headers,
    )
    assert resp.status_code == 415


def test_un_pdf_legitimo_se_sigue_aceptando(client: TestClient, upload_ctx):
    lesson, headers = upload_ctx

    resp = client.post(
        f"/lessons/{lesson.id}/files",
        files={"file": ("apuntes.pdf", b"%PDF-1.7\nde verdad", "application/pdf")},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text


# ---------- Ventana de gracia en la rotación ----------

def test_reutilizar_la_cookie_recien_rotada_no_tumba_la_sesion(
    client: TestClient, db: Session
):
    """Dos refrescos solapados son normales: el navegador dispara el segundo
    antes de que llegue la cookie del primero. Sin ventana de gracia, el
    segundo presentaba un token ya revocado y cerraba la sesión."""
    make_user(db, name="sessionuser")
    _login(client)

    # Guardamos la cookie ANTES de refrescar: es la que llevaría la petición
    # que salió del navegador demasiado pronto.
    cookie_previa = client.cookies.get(REFRESH_COOKIE_NAME)

    primera = client.post("/token/refresh")
    assert primera.status_code == 200

    segunda = client.post(
        "/token/refresh", cookies={REFRESH_COOKIE_NAME: cookie_previa}
    )
    assert segunda.status_code == 200
    assert "access_token" in segunda.json()

    # Y entrega cookie nueva: si no lo hiciera, un cliente que perdió la
    # anterior (el navegador cancela la respuesta al encadenar navegaciones)
    # se quedaría atascado en un token que muere al cerrarse la ventana.
    assert "set-cookie" in {k.lower() for k in segunda.headers}


def test_fuera_de_la_ventana_el_token_revocado_sigue_dando_401(
    client: TestClient, db: Session, monkeypatch
):
    """La ventana es una concesión acotada, no una vía libre: pasados los
    segundos de gracia, reutilizar un token rotado vuelve a ser 401."""
    monkeypatch.setattr(
        "modules.auth.refresh_service.REFRESH_GRACE_SECONDS", 0
    )
    make_user(db, name="sessionuser")
    _login(client)
    cookie_previa = client.cookies.get(REFRESH_COOKIE_NAME)

    assert client.post("/token/refresh").status_code == 200

    tardia = client.post(
        "/token/refresh", cookies={REFRESH_COOKIE_NAME: cookie_previa}
    )
    assert tardia.status_code == 401


def test_el_login_purga_los_tokens_caducados_del_usuario(
    client: TestClient, db: Session
):
    """Las filas de refresh_tokens no se borraban nunca, solo se marcaban."""
    user = make_user(db, name="sessionuser")
    _login(client)

    caducado = RefreshTokenModel(
        user_id=user.id,
        token_hash="c" * 64,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add(caducado)
    db.commit()

    vigentes_antes = (
        db.query(RefreshTokenModel)
        .filter(RefreshTokenModel.expires_at > datetime.now(timezone.utc))
        .count()
    )

    _login(client)

    hashes = {row.token_hash for row in db.query(RefreshTokenModel).all()}
    assert "c" * 64 not in hashes, "el token caducado debería haberse borrado"
    # El login añade uno nuevo y no toca los que siguen vigentes.
    assert len(hashes) == vigentes_antes + 1
