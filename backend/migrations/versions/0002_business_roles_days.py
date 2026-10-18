"""businesses, roles and business days

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-16 00:00:00.000000

Turns the single-user app into a multi-employee one:
- every existing user becomes the OWNER of a new business that reuses the
  user's id (so existing rows can be mapped without a lookup table);
- jobs move from user_id to business_id;
- time_entries and expenses gain business_id (user_id is kept: who did it);
- new business_days table for the daily cash close and closed days.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "businesses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # One business per existing user, sharing its id.
    op.execute(
        "INSERT INTO businesses (id, name, currency, created_at, updated_at) "
        "SELECT id, full_name, 'EUR', now(), now() FROM users"
    )

    # users: business + role
    op.add_column("users", sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column(
        "users", sa.Column("role", sa.String(30), nullable=False, server_default="hours")
    )
    op.execute("UPDATE users SET business_id = id, role = 'owner'")
    op.alter_column("users", "business_id", nullable=False)
    op.create_foreign_key(
        "fk_users_business_id", "users", "businesses", ["business_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_users_business_id", "users", ["business_id"])

    # jobs: user_id -> business_id
    op.add_column("jobs", sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.execute("UPDATE jobs SET business_id = user_id")
    op.alter_column("jobs", "business_id", nullable=False)
    op.create_foreign_key(
        "fk_jobs_business_id", "jobs", "businesses", ["business_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_jobs_business_id", "jobs", ["business_id"])
    op.drop_index("ix_jobs_user_id", table_name="jobs")
    op.drop_column("jobs", "user_id")

    # time_entries / expenses: add business_id
    for table in ("time_entries", "expenses"):
        op.add_column(
            table, sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=True)
        )
        op.execute(
            f"UPDATE {table} t SET business_id = u.business_id FROM users u WHERE u.id = t.user_id"
        )
        op.alter_column(table, "business_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table}_business_id",
            table,
            "businesses",
            ["business_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_index(f"ix_{table}_business_id", table, ["business_id"])

    op.create_table(
        "business_days",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("cash", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("card", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("cash_out", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(2000), nullable=True),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["closed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "date", name="uq_business_days_date"),
    )
    op.create_index("ix_business_days_business_id", "business_days", ["business_id"])
    op.create_index("ix_business_days_date", "business_days", ["date"])


def downgrade() -> None:
    op.drop_table("business_days")

    for table in ("expenses", "time_entries"):
        op.drop_index(f"ix_{table}_business_id", table_name=table)
        op.drop_constraint(f"fk_{table}_business_id", table, type_="foreignkey")
        op.drop_column(table, "business_id")

    # jobs go back to the business owner
    op.add_column("jobs", sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.execute(
        "UPDATE jobs j SET user_id = u.id FROM users u "
        "WHERE u.business_id = j.business_id AND u.role = 'owner'"
    )
    op.alter_column("jobs", "user_id", nullable=False)
    op.create_foreign_key(
        "jobs_user_id_fkey", "jobs", "users", ["user_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_jobs_user_id", "jobs", ["user_id"])
    op.drop_index("ix_jobs_business_id", table_name="jobs")
    op.drop_constraint("fk_jobs_business_id", "jobs", type_="foreignkey")
    op.drop_column("jobs", "business_id")

    op.drop_index("ix_users_business_id", table_name="users")
    op.drop_constraint("fk_users_business_id", "users", type_="foreignkey")
    op.drop_column("users", "role")
    op.drop_column("users", "business_id")

    op.drop_table("businesses")
