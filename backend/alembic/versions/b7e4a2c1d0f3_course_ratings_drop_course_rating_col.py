"""course_ratings table and drop courses.rating

Revision ID: b7e4a2c1d0f3
Revises: f8a2c1d0e4b1
Create Date: 2026-05-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7e4a2c1d0f3"
down_revision: Union[str, Sequence[str], None] = "f8a2c1d0e4b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_ratings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "course_id", name="uq_course_rating_user_course"
        ),
    )
    op.create_index(op.f("ix_course_ratings_id"), "course_ratings", ["id"], unique=False)
    op.create_index(
        op.f("ix_course_ratings_user_id"), "course_ratings", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_course_ratings_course_id"), "course_ratings", ["course_id"], unique=False
    )
    op.drop_column("courses", "rating")


def downgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("rating", sa.Float(), nullable=True),
    )
    op.drop_index(op.f("ix_course_ratings_course_id"), table_name="course_ratings")
    op.drop_index(op.f("ix_course_ratings_user_id"), table_name="course_ratings")
    op.drop_index(op.f("ix_course_ratings_id"), table_name="course_ratings")
    op.drop_table("course_ratings")
