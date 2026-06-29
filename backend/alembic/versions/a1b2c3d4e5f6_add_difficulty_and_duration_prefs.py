"""add course difficulty and recommendation duration/difficulty prefs

Revision ID: a1b2c3d4e5f6
Revises: c3a9f1e2b4d5
Create Date: 2026-06-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "c3a9f1e2b4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

difficulty_enum = sa.Enum(
    "beginner",
    "intermediate",
    "advanced",
    name="difficulty",
)


def upgrade() -> None:
    difficulty_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "courses",
        sa.Column(
            "difficulty",
            difficulty_enum,
            nullable=False,
            server_default="intermediate",
        ),
    )
    op.execute(sa.text("UPDATE courses SET difficulty = 'intermediate'"))
    op.add_column(
        "user_recommendations",
        sa.Column(
            "preferred_duration_buckets",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
    )
    op.add_column(
        "user_recommendations",
        sa.Column(
            "preferred_difficulties",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("user_recommendations", "preferred_difficulties")
    op.drop_column("user_recommendations", "preferred_duration_buckets")
    op.drop_column("courses", "difficulty")
    difficulty_enum.drop(op.get_bind(), checkfirst=True)
