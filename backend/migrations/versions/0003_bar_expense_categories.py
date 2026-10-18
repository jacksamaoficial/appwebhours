"""bar expense categories

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-16 00:00:00.000000

Expense categories now fit a bar. food, equipment and other keep their value;
the removed ones (transport, software, office) become "other".
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE expenses SET category = 'other' "
        "WHERE category IN ('transport', 'software', 'office')"
    )


def downgrade() -> None:
    # The new bar categories did not exist before; fold them into "other".
    op.execute(
        "UPDATE expenses SET category = 'other' "
        "WHERE category NOT IN ('transport', 'food', 'equipment', 'software', 'office', 'other')"
    )
