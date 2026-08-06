"""Fixtures compartidas para los tests de integración con BD y de API.

A diferencia de los tests del recomendador (que mockean `db.query`), estos
tests usan una base de datos SQLite en memoria creada a partir de los
modelos reales de SQLAlchemy (`Base.metadata.create_all`). No usamos
Alembic ni Postgres: los modelos actuales no dependen de features
específicas de Postgres (no hay JSONB, arrays nativos, etc.), así que
SQLite es un sustituto válido y mucho más rápido para tests.

No hace falta ejecutar este archivo directamente; pytest lo carga
automáticamente y lo pone a disposición de cualquier test en `test/`.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterator, Optional

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from core.database import Base, get_db  # noqa: E402
from core.security import hash_password  # noqa: E402
from main import app  # noqa: E402 - importing it registers every model on Base.metadata
from modules.courses.model import (  # noqa: E402
    Category,
    CourseModel,
    CourseType,
    Difficulty,
    Language,
    Site,
)
from modules.enrollments.model import EnrollmentModel, EnrollmentStatus  # noqa: E402
from modules.lessons.model import LessonModel, LessonType  # noqa: E402
from modules.users.model import UserModel, UserRole  # noqa: E402


@pytest.fixture()
def db() -> Iterator[Session]:
    """Sesión SQLAlchemy real sobre una BD SQLite en memoria, nueva por test.

    `StaticPool` es imprescindible: sin él, cada conexión SQLite `:memory:`
    abriría una base de datos en blanco distinta y las tablas creadas no
    serían visibles entre el setup del test y las peticiones HTTP.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite ignora `ondelete="CASCADE"` a menos que se active este pragma
    # por conexión; lo necesitamos para que los tests de borrado en cascada
    # (curso -> matrículas, etc.) se comporten igual que en Postgres.
    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, connection_record):  # noqa: ANN001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db: Session) -> Iterator[TestClient]:
    """TestClient de FastAPI con `get_db` sustituido por la sesión de test.

    Todas las rutas dependen de `Depends(get_db)`; sobreescribiendo esa
    dependencia, las peticiones HTTP hechas con este cliente leen/escriben
    en la misma base de datos SQLite en memoria que el test controla
    directamente a través de la fixture `db`.
    """

    def _override_get_db() -> Iterator[Session]:
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def make_user(
    db: Session,
    *,
    name: str = "student1",
    email: Optional[str] = None,
    password: str = "secret123",
    role: UserRole = UserRole.STUDENT,
) -> UserModel:
    """Crea y persiste un usuario con contraseña hasheada real (bcrypt)."""
    user = UserModel(
        name=name,
        email=email or f"{name}@example.com",
        role=role,
        hash_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_course(
    db: Session,
    *,
    title: str = "Intro course",
    instructor_id: Optional[int] = None,
    site: Site = Site.COURSERA,
    category: Category = Category.DATA_SCIENCE,
    language: Language = Language.ENGLISH,
    course_type: CourseType = CourseType.COURSE,
    duration_seconds: Optional[int] = 3600,
    difficulty: Difficulty = Difficulty.INTERMEDIATE,
) -> CourseModel:
    course = CourseModel(
        title=title,
        url="https://example.com/course",
        site=site,
        category=category,
        language=language,
        course_type=course_type,
        duration_seconds=duration_seconds,
        difficulty=difficulty,
        instructor_id=instructor_id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def make_lesson(
    db: Session,
    course: CourseModel,
    *,
    title: str = "Lesson",
    position: int = 1,
    lesson_type: LessonType = LessonType.TEXT,
) -> LessonModel:
    lesson = LessonModel(
        course_id=course.id,
        title=title,
        lesson_type=lesson_type,
        position=position,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


def make_enrollment(db: Session, user: UserModel, course: CourseModel) -> EnrollmentModel:
    enrollment = EnrollmentModel(
        user_id=user.id,
        course_id=course.id,
        status=EnrollmentStatus.IN_PROGRESS,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def auth_headers(client: TestClient, name: str, password: str) -> dict[str, str]:
    """Hace login real vía `POST /token` (como haría el frontend) y devuelve
    la cabecera Authorization lista para usar en peticiones autenticadas."""
    resp = client.post("/token", data={"username": name, "password": password})
    resp.raise_for_status()
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
