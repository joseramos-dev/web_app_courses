from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import require_role
from modules.dashboard.schema import (
    AdminDashboardSchema,
    InstructorDashboardSchema,
    StudentDashboardSchema,
)
from modules.dashboard.service import (
    get_admin_summary,
    get_instructor_summary,
    get_student_summary,
)


dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


# Admins are allowed on every endpoint so they can preview each role's
# experience without juggling accounts. The actual data is still scoped
# by the caller's id (an admin viewing the student dashboard sees their
# own student data, which is normally empty).


@dashboard_router.get("/student/me", response_model=StudentDashboardSchema)
def student_dashboard(
    db: Annotated[Session, Depends(get_db)],
    user=Depends(require_role(["student", "admin"])),
):
    return get_student_summary(db, user.id)


@dashboard_router.get("/instructor/me", response_model=InstructorDashboardSchema)
def instructor_dashboard(
    db: Annotated[Session, Depends(get_db)],
    user=Depends(require_role(["instructor", "admin"])),
):
    return get_instructor_summary(db, user.id)


@dashboard_router.get("/admin", response_model=AdminDashboardSchema)
def admin_dashboard(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(require_role(["admin"])),
):
    return get_admin_summary(db)
