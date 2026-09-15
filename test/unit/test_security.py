"""Tests unitarios del núcleo de autenticación (`core/security.py`): hashing
de contraseñas y emisión de JWT. No tocan base de datos ni HTTP.

    cd backend
    uv run pytest ../test/unit/test_security.py -v
"""

from __future__ import annotations

from datetime import datetime, timezone

from jose import jwt

from core.security import ALGORITHM, SECRET_KEY, create_access_token, hash_password, verify_password
from modules.users.model import UserRole


# ---------- Hashing de contraseñas ----------

def test_verify_password_acepta_la_contrasena_correcta():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed) is True


def test_verify_password_rechaza_una_contrasena_incorrecta():
    hashed = hash_password("secret123")
    assert verify_password("otra-cosa", hashed) is False


def test_hash_password_no_devuelve_el_texto_plano():
    assert hash_password("secret123") != "secret123"


def test_contrasenas_largas_siguen_verificando_bien():
    """bcrypt solo usa los primeros 72 bytes; `hash_password` trunca antes
    de hashear para que dos contraseñas que solo difieren después del byte
    72 no verifiquen como iguales por accidente."""
    larga = "x" * 100
    hashed = hash_password(larga)

    assert verify_password(larga, hashed) is True
    assert verify_password("x" * 71 + "y", hashed) is False


# ---------- Tokens de acceso ----------

def test_create_access_token_codifica_el_usuario_y_el_rol():
    token = create_access_token(user_id=42, role=UserRole.INSTRUCTOR)

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "42"
    assert payload["role"] == UserRole.INSTRUCTOR.value


def test_create_access_token_expira_en_el_futuro():
    token = create_access_token(user_id=1, role=UserRole.STUDENT)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["exp"] > datetime.now(timezone.utc).timestamp()
