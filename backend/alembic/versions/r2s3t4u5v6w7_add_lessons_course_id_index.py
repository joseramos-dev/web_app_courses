"""add indexes on lessons.course_id and courses.instructor_id

Both columns are filtered on hot paths (curriculum listing, lesson-count
recalculation on every completed lesson, instructor dashboard) but only had
a foreign key, which Postgres does not index automatically.

Revision ID: r2s3t4u5v6w7
Revises: q1r2s3t4u5v6
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op


revision: str = "r2s3t4u5v6w7"
down_revision: Union[str, Sequence[str], None] = "q1r2s3t4u5v6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        op.f("ix_lessons_course_id"), "lessons", ["course_id"], unique=False
    )
    op.create_index(
        op.f("ix_courses_instructor_id"), "courses", ["instructor_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_courses_instructor_id"), table_name="courses")
    op.drop_index(op.f("ix_lessons_course_id"), table_name="lessons")
