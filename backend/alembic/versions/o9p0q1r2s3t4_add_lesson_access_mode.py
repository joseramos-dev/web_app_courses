"""add lesson_access_mode to courses

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
Create Date: 2026-08-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "o9p0q1r2s3t4"
down_revision: Union[str, Sequence[str], None] = "n8o9p0q1r2s3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    lessonaccessmode = sa.Enum("open", "progressive", name="lessonaccessmode")
    lessonaccessmode.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "courses",
        sa.Column(
            "lesson_access_mode",
            lessonaccessmode,
            server_default="open",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("courses", "lesson_access_mode")
    sa.Enum(name="lessonaccessmode").drop(op.get_bind(), checkfirst=True)
