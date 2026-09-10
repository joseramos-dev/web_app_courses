"""add denormalized rating stats and recommendation indexes on courses

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
Create Date: 2026-08-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p0q1r2s3t4u5"
down_revision: Union[str, Sequence[str], None] = "o9p0q1r2s3t4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("avg_rating", sa.Float(), nullable=True))
    op.add_column(
        "courses",
        sa.Column("ratings_count", sa.Integer(), server_default="0", nullable=False),
    )

    op.execute(
        """
        UPDATE courses c
        SET avg_rating = sub.avg_score,
            ratings_count = sub.cnt
        FROM (
            SELECT course_id,
                   AVG(score::float) AS avg_score,
                   COUNT(*) AS cnt
            FROM course_ratings
            GROUP BY course_id
        ) sub
        WHERE c.id = sub.course_id
        """
    )

    op.create_index("ix_courses_is_public", "courses", ["is_public"], unique=False)
    op.create_index(
        "ix_courses_is_public_avg_rating",
        "courses",
        ["is_public", "avg_rating"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_courses_is_public_avg_rating", table_name="courses")
    op.drop_index("ix_courses_is_public", table_name="courses")
    op.drop_column("courses", "ratings_count")
    op.drop_column("courses", "avg_rating")
