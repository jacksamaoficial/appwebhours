"""pay bands and overtime rate

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-18 00:00:00.000000

Per-employee pay schedule: time bands with an hourly rate each, plus an
overtime rate for time worked outside every band.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("overtime_rate", sa.Numeric(10, 2), nullable=True))
    op.create_table(
        "pay_bands",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pay_bands_business_id", "pay_bands", ["business_id"])
    op.create_index("ix_pay_bands_user_id", "pay_bands", ["user_id"])


def downgrade() -> None:
    op.drop_table("pay_bands")
    op.drop_column("users", "overtime_rate")
