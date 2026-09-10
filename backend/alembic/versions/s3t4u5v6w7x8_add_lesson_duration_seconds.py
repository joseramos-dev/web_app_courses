"""add duration_seconds to lessons

Duration is declared per lesson from now on; topic and course durations are
derived from these values. Nullable on purpose: existing lessons must not be
given a made-up duration, and a lesson without one simply adds 0 to the sum.

The 5273 imported (Kaggle) courses have no lessons at all, so the recalculation
never runs for them and their CSV duration is preserved untouched.

Revision ID: s3t4u5v6w7x8
Revises: r2s3t4u5v6w7
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "s3t4u5v6w7x8"
down_revision: Union[str, Sequence[str], None] = "r2s3t4u5v6w7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lessons",
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("lessons", "duration_seconds")
