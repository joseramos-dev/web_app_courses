"""add is_submission flag to lesson_files

Course material uploaded by the staff and assignment files uploaded by
students share the `lesson_files` table. Without a discriminator every
enrolled student could list and download their classmates' submissions.

Revision ID: q1r2s3t4u5v6
Revises: p0q1r2s3t4u5
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "q1r2s3t4u5v6"
down_revision: Union[str, Sequence[str], None] = "p0q1r2s3t4u5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lesson_files",
        sa.Column(
            "is_submission",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )

    # Backfill: any file already referenced by a submission is a submission.
    op.execute(
        """
        UPDATE lesson_files
        SET is_submission = true
        WHERE id IN (
            SELECT file_id FROM lesson_submissions WHERE file_id IS NOT NULL
        )
        """
    )


def downgrade() -> None:
    op.drop_column("lesson_files", "is_submission")
