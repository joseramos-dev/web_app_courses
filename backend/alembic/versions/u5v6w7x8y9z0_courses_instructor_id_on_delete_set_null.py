"""courses.instructor_id: ON DELETE SET NULL

The foreign key was created without a delete rule, so Postgres defaulted to NO
ACTION. Since `UserModel` declares no relationship to courses, deleting a user
is a bare DELETE that the database has to resolve on its own -- and it refused,
raising a foreign-key violation, whenever the account owned a course. That broke
both delete paths: the admin panel's "delete user" returned a generic 500, and
the demo-account cleanup aborted without removing a single row, because it
commits the whole batch at once.

SET NULL keeps the course and drops the ownership, which is the state the
catalogue is already in: `instructor_id` is nullable and the 300 imported
courses have none.

Revision ID: u5v6w7x8y9z0
Revises: t4u5v6w7x8y9
Create Date: 2026-09-07

"""
from typing import Sequence, Union

from alembic import op


revision: str = "u5v6w7x8y9z0"
down_revision: Union[str, Sequence[str], None] = "t4u5v6w7x8y9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK = "courses_instructor_id_fkey"


def upgrade() -> None:
    op.drop_constraint(_FK, "courses", type_="foreignkey")
    op.create_foreign_key(
        _FK, "courses", "users", ["instructor_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint(_FK, "courses", type_="foreignkey")
    op.create_foreign_key(_FK, "courses", "users", ["instructor_id"], ["id"])
