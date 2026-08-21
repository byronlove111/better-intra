"""add url to events

Revision ID: e8f9a0b1c2d3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-21 13:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "url")
