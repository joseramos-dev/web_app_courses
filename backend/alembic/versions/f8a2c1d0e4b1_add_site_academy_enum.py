"""add ACADEMY to site enum (PostgreSQL native)

Revision ID: f8a2c1d0e4b1
Revises: 6ee13e1a9595
Create Date: 2026-05-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f8a2c1d0e4b1"
down_revision: Union[str, Sequence[str], None] = "6ee13e1a9595"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TYPE site ADD VALUE IF NOT EXISTS 'ACADEMY'"))


def downgrade() -> None:
    pass
