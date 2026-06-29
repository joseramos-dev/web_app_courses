"""add assignment lesson type and lesson_submissions table

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
Create Date: 2026-06-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "h3i4j5k6l7m8"
down_revision: Union[str, Sequence[str], None] = "g2h3i4j5k6l7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


submission_status = postgresql.ENUM(
    "PENDING",
    "GRADED",
    "RETURNED",
    name="submissionstatus",
    create_type=False,
)


def upgrade() -> None:
    op.execute("ALTER TYPE lessontype ADD VALUE IF NOT EXISTS 'ASSIGNMENT'")

    submission_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "lessons",
        sa.Column("max_score", sa.Float(), server_default="100", nullable=True),
    )
    op.add_column(
        "lessons",
        sa.Column("passing_score", sa.Float(), server_default="70", nullable=True),
    )
    op.add_column(
        "lessons",
        sa.Column(
            "allows_file_submission",
            sa.Boolean(),
            server_default="true",
            nullable=True,
        ),
    )

    op.create_table(
        "lesson_submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("enrollment_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("file_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            submission_status,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["enrollment_id"], ["enrollments.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["file_id"], ["lesson_files.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["graded_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "enrollment_id", "lesson_id", name="uq_submission_enrollment_lesson"
        ),
    )
    op.create_index(
        op.f("ix_lesson_submissions_id"),
        "lesson_submissions",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lesson_submissions_enrollment_id"),
        "lesson_submissions",
        ["enrollment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lesson_submissions_lesson_id"),
        "lesson_submissions",
        ["lesson_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_lesson_submissions_lesson_id"), table_name="lesson_submissions"
    )
    op.drop_index(
        op.f("ix_lesson_submissions_enrollment_id"), table_name="lesson_submissions"
    )
    op.drop_index(op.f("ix_lesson_submissions_id"), table_name="lesson_submissions")
    op.drop_table("lesson_submissions")

    op.drop_column("lessons", "allows_file_submission")
    op.drop_column("lessons", "passing_score")
    op.drop_column("lessons", "max_score")

    submission_status.drop(op.get_bind(), checkfirst=True)
    # PostgreSQL does not support removing enum values from lessontype safely.
