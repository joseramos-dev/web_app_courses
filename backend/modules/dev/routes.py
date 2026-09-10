"""Development-only maintenance endpoints.

Kept in their own module rather than tucked into the courses or users domain:
wiping the database is destructive and should be easy to find and easy to drop.
The router is only registered when ENABLE_DEV_ROUTES is on, and every endpoint
additionally requires an admin.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database import Base, get_db
from core.dependencies import require_role
from modules.courses.service import DEFAULT_SAMPLE_SIZE, populate_courses
from modules.dev.schema import UsersImportResultSchema, UsersImportSchema
from modules.dev.seeding import (
    delete_demo_users,
    import_users,
    seed_demo_users,
    seed_missing_curricula,
)
from modules.dev.simulation import simulate_students

dev_router = APIRouter(prefix="/dev", tags=["dev"])

# Alembic's bookkeeping table is not in Base.metadata, so it is never truncated
# here -- wiping it would leave the migration history dangling.
_USER_TABLES = frozenset({"users"})


class ResetResultSchema(BaseModel):
    tables_truncated: list[str]
    users_kept: bool


class SeedCoursesResultSchema(BaseModel):
    courses_imported: int
    courses_seeded: int
    topics_created: int
    lessons_created: int
    questions_created: int


class SeedUsersResultSchema(BaseModel):
    students: int
    instructors: int
    total: int


class DeleteUsersResultSchema(BaseModel):
    deleted: int


class SimulateStudentsResultSchema(BaseModel):
    students: int
    enrollments: int
    completed_courses: int
    abandoned_courses: int
    lessons: int
    attempts: int
    failed_attempts: int
    ratings: int
    skipped: int


@dev_router.get("/status", status_code=status.HTTP_200_OK)
def dev_status():
    """Tells the frontend the development tools are reachable.

    The admin dashboard cannot infer this on its own: `import.meta.env.DEV` only
    describes how the frontend was built, and the Docker image runs the Vite dev
    server regardless of the backend's configuration. Asking the backend is the
    only honest signal -- when dev routes are off this route does not exist and
    the request 404s.
    """
    return {"enabled": True}


@dev_router.post(
    "/seed-courses",
    response_model=SeedCoursesResultSchema,
    status_code=status.HTTP_200_OK,
)
def seed_courses(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
    count: int = Query(
        DEFAULT_SAMPLE_SIZE,
        ge=1,
        le=2000,
        description="How many catalogue courses to import before seeding.",
    ),
):
    """Import a sample of the catalogue and give every bare course a curriculum.

    Both halves are additive: the import skips titles already present and the
    seeding skips courses that already have topics, so pressing the button twice
    grows the catalogue instead of duplicating it.
    """
    imported = populate_courses(db, sample_size=count)
    totals = seed_missing_curricula(db)
    return SeedCoursesResultSchema(
        courses_imported=imported,
        courses_seeded=totals["courses"],
        topics_created=totals["topics"],
        lessons_created=totals["lessons"],
        questions_created=totals["questions"],
    )


@dev_router.post(
    "/seed-users",
    response_model=SeedUsersResultSchema,
    status_code=status.HTTP_200_OK,
)
def seed_users(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
    count: int = Query(100, ge=1, le=1000, description="How many accounts to create."),
):
    """Create demo accounts, mostly students with a few instructors.

    Each account's password is its own username.
    """
    return SeedUsersResultSchema(**seed_demo_users(db, count))


@dev_router.post(
    "/import-users",
    response_model=UsersImportResultSchema,
    status_code=status.HTTP_201_CREATED,
)
def import_users_from_json(
    payload: UsersImportSchema,
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
):
    """Create student accounts from a JSON list.

    The standardised way to load a large batch of learners: each entry needs a
    name and an email, and the password defaults to the name so the accounts can
    be used straight away. Entries whose name or email is already taken are
    skipped, so the same file can be replayed safely.

    Development-only on purpose: passwords equal to usernames are fine for test
    data and unacceptable anywhere else.
    """
    return UsersImportResultSchema(**import_users(db, payload.users))


@dev_router.delete(
    "/seed-users",
    response_model=DeleteUsersResultSchema,
    status_code=status.HTTP_200_OK,
)
def remove_seeded_users(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
):
    """Remove every demo account, leaving real users untouched."""
    return DeleteUsersResultSchema(deleted=delete_demo_users(db))


@dev_router.post(
    "/simulate-students",
    response_model=SimulateStudentsResultSchema,
    status_code=status.HTTP_200_OK,
)
def simulate_students_route(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
):
    """Give demo students without enrollments a simulated study history."""
    return SimulateStudentsResultSchema(**simulate_students(db))


@dev_router.post(
    "/reset-database",
    response_model=ResetResultSchema,
    status_code=status.HTTP_200_OK,
)
def reset_database(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
    keep_users: bool = Query(
        True,
        description=(
            "Keep the user accounts. With false the database is emptied "
            "completely; recover with POST /users/bootstrap_admin, then log in "
            "and repopulate."
        ),
    ),
):
    """Empty the database so a demo dataset can be seeded from scratch."""
    tables = [t.name for t in Base.metadata.sorted_tables]
    if keep_users:
        tables = [name for name in tables if name not in _USER_TABLES]

    # RESTART IDENTITY so seeded ids start from 1 and runs are comparable;
    # CASCADE because the tables reference each other in both directions.
    quoted = ", ".join(f'"{name}"' for name in tables)
    db.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))
    db.commit()

    return ResetResultSchema(tables_truncated=sorted(tables), users_kept=keep_users)
