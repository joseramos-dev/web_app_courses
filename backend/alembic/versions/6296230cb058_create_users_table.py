"""create users table

Revision ID: 6296230cb058
Revises:
Create Date: 2026-05-06 09:30:11.273723

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "6296230cb058"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enums (member names as stored by SQLAlchemy native enums). `site` gets ACADEMY in f8a2c1d0e4b1.
    sa.Enum("STUDENT", "INSTRUCTOR", "ADMIN", name="userrole").create(op.get_bind(), checkfirst=True)
    sa.Enum(
        "COURSERA",
        "FUTURE_LEARN",
        "UDACTITY",
        "SIMPLILEARN",
        name="site",
    ).create(op.get_bind(), checkfirst=True)
    sa.Enum(
        "NON_DEFINED",
        "BUSINESS",
        "COMPUTER_SCIENCE",
        "DATA_SCIENCE",
        "HEALTH",
        "INFORMATION_TECHNOLOGY",
        "PHYSICAL_SCIENCE_AND_ENGINEERING",
        "ARTS_AND_HUMANITIES",
        "LANGUAGE_LEARNING",
        "SOCIAL_SCIENCES",
        "PERSONAL_DEVELOPMENT",
        "MATH_AND_LOGIC",
        name="category",
    ).create(op.get_bind(), checkfirst=True)
    sa.Enum(
        "ENGLISH",
        "NON_DEFINED",
        "SPANISH",
        "FRENCH",
        "JAPANESE",
        "PORTUGUESE",
        "CHINESE",
        "GERMAN",
        "ARABIC",
        "INDONESIAN",
        "RUSSIAN",
        name="language",
    ).create(op.get_bind(), checkfirst=True)
    sa.Enum(
        "SPECIALIZATION",
        "PROFESSIONAL_CERTIFICATE",
        "COURSE",
        "PROJECT",
        "NON_DEFINED",
        name="coursetype",
    ).create(op.get_bind(), checkfirst=True)
    sa.Enum("TEXT", "VIDEO", "TEST", "MULTIPLE_SELECTION", name="lessontype").create(
        op.get_bind(), checkfirst=True
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hash_password", sa.Text(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "STUDENT",
                "INSTRUCTOR",
                "ADMIN",
                name="userrole",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "time_creation",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_name"), "users", ["name"], unique=True)

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column(
            "site",
            postgresql.ENUM(
                "COURSERA",
                "FUTURE_LEARN",
                "UDACTITY",
                "SIMPLILEARN",
                name="site",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "category",
            postgresql.ENUM(
                "NON_DEFINED",
                "BUSINESS",
                "COMPUTER_SCIENCE",
                "DATA_SCIENCE",
                "HEALTH",
                "INFORMATION_TECHNOLOGY",
                "PHYSICAL_SCIENCE_AND_ENGINEERING",
                "ARTS_AND_HUMANITIES",
                "LANGUAGE_LEARNING",
                "SOCIAL_SCIENCES",
                "PERSONAL_DEVELOPMENT",
                "MATH_AND_LOGIC",
                name="category",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "language",
            postgresql.ENUM(
                "ENGLISH",
                "NON_DEFINED",
                "SPANISH",
                "FRENCH",
                "JAPANESE",
                "PORTUGUESE",
                "CHINESE",
                "GERMAN",
                "ARABIC",
                "INDONESIAN",
                "RUSSIAN",
                name="language",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "course_type",
            postgresql.ENUM(
                "SPECIALIZATION",
                "PROFESSIONAL_CERTIFICATE",
                "COURSE",
                "PROJECT",
                "NON_DEFINED",
                name="coursetype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("subcategory", sa.String(), nullable=True),
        sa.Column("intro", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("instructor_id", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column(
            "time_creation",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "time_update",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["instructor_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_courses_id"), "courses", ["id"], unique=False)
    op.create_index(op.f("ix_courses_title"), "courses", ["title"], unique=False)

    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column(
            "lesson_type",
            postgresql.ENUM(
                "TEXT",
                "VIDEO",
                "TEST",
                "MULTIPLE_SELECTION",
                name="lessontype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "create_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "update_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "position", name="uq_course_position"),
    )
    op.create_index(op.f("ix_lessons_id"), "lessons", ["id"], unique=False)
    op.add_column(
        "courses",
        sa.Column(
            "create_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column(
        "courses",
        sa.Column(
            "update_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.drop_column("courses", "time_creation")
    op.drop_column("courses", "time_update")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "courses",
        sa.Column(
            "time_update",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.add_column(
        "courses",
        sa.Column(
            "time_creation",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.drop_column("courses", "update_at")
    op.drop_column("courses", "create_at")
    op.drop_index(op.f("ix_lessons_id"), table_name="lessons")
    op.drop_table("lessons")
    op.drop_index(op.f("ix_courses_title"), table_name="courses")
    op.drop_index(op.f("ix_courses_id"), table_name="courses")
    op.drop_table("courses")
    op.drop_index(op.f("ix_users_name"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    sa.Enum(name="lessontype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="coursetype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="language").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="category").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="site").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
