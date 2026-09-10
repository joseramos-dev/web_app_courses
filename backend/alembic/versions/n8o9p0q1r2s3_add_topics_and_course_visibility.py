"""add topics, course visibility, intro video, topic_id on lessons

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
Create Date: 2026-08-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "n8o9p0q1r2s3"
down_revision: Union[str, Sequence[str], None] = "m7n8o9p0q1r2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("is_public", sa.Boolean(), server_default="true", nullable=False),
    )
    op.add_column("courses", sa.Column("intro_video_url", sa.String(), nullable=True))

    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "position", name="uq_topic_course_position"),
    )
    op.create_index(op.f("ix_topics_id"), "topics", ["id"], unique=False)
    op.create_index(op.f("ix_topics_course_id"), "topics", ["course_id"], unique=False)

    op.add_column("lessons", sa.Column("topic_id", sa.Integer(), nullable=True))

    conn = op.get_bind()
    courses = conn.execute(sa.text("SELECT id FROM courses")).fetchall()
    for (course_id,) in courses:
        result = conn.execute(
            sa.text(
                "INSERT INTO topics (course_id, name, position) "
                "VALUES (:course_id, 'Course content', 1) RETURNING id"
            ),
            {"course_id": course_id},
        )
        topic_id = result.scalar_one()
        conn.execute(
            sa.text(
                "UPDATE lessons SET topic_id = :topic_id WHERE course_id = :course_id"
            ),
            {"topic_id": topic_id, "course_id": course_id},
        )

    op.alter_column("lessons", "topic_id", nullable=False)
    op.create_foreign_key(
        "fk_lessons_topic_id", "lessons", "topics", ["topic_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index(op.f("ix_lessons_topic_id"), "lessons", ["topic_id"], unique=False)

    op.drop_constraint("uq_course_position", "lessons", type_="unique")
    op.create_unique_constraint("uq_topic_lesson_position", "lessons", ["topic_id", "position"])

    op.execute(
        "ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'course_visibility'"
    )


def downgrade() -> None:
    op.drop_constraint("uq_topic_lesson_position", "lessons", type_="unique")
    op.create_unique_constraint("uq_course_position", "lessons", ["course_id", "position"])
    op.drop_constraint("fk_lessons_topic_id", "lessons", type_="foreignkey")
    op.drop_index(op.f("ix_lessons_topic_id"), table_name="lessons")
    op.drop_column("lessons", "topic_id")
    op.drop_index(op.f("ix_topics_course_id"), table_name="topics")
    op.drop_index(op.f("ix_topics_id"), table_name="topics")
    op.drop_table("topics")
    op.drop_column("courses", "intro_video_url")
    op.drop_column("courses", "is_public")
