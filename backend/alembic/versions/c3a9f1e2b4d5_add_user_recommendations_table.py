"""add user_recommendations table

Revision ID: c3a9f1e2b4d5
Revises: b7e4a2c1d0f3
Create Date: 2026-06-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3a9f1e2b4d5"
down_revision: Union[str, Sequence[str], None] = "b7e4a2c1d0f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_recommendations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "preferred_sites",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
        sa.Column(
            "preferred_categories",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
        sa.Column(
            "preferred_languages",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
        sa.Column(
            "preferred_course_types",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_recommendations_user_id"),
    )
    op.create_index(
        op.f("ix_user_recommendations_id"),
        "user_recommendations",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_recommendations_user_id"),
        "user_recommendations",
        ["user_id"],
        unique=True,
    )

    op.execute(
        """
        INSERT INTO user_recommendations (
            user_id,
            preferred_sites,
            preferred_categories,
            preferred_languages,
            preferred_course_types
        )
        SELECT id, '[]'::json, '[]'::json, '[]'::json, '[]'::json
        FROM users
        WHERE id NOT IN (SELECT user_id FROM user_recommendations)
        """
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_user_recommendations_user_id"),
        table_name="user_recommendations",
    )
    op.drop_index(
        op.f("ix_user_recommendations_id"),
        table_name="user_recommendations",
    )
    op.drop_table("user_recommendations")
