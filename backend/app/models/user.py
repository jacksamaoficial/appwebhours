from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.core.database import Base


class Role(str, Enum):
    """Hierarchical roles: each one includes the permissions of the previous."""

    HOURS = "hours"
    HOURS_EXPENSES = "hours_expenses"
    HOURS_EXPENSES_SALES = "hours_expenses_sales"
    OWNER = "owner"


_ROLE_RANK = {
    Role.HOURS: 0,
    Role.HOURS_EXPENSES: 1,
    Role.HOURS_EXPENSES_SALES: 2,
    Role.OWNER: 3,
}


def role_at_least(role: str, minimum: Role) -> bool:
    return _ROLE_RANK[Role(role)] >= _ROLE_RANK[minimum]


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(30), default=Role.HOURS.value, nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Bumped on password reset: tokens issued with an older version stop working
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Hourly rate for time worked outside the employee's pay bands
    overtime_rate: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        onupdate=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )

    # Relationships — lazy="raise" to prevent accidental N+1
    business: Mapped["Business"] = relationship(  # noqa: F821
        "Business", back_populates="users", lazy="raise"
    )
    time_entries: Mapped[list["TimeEntry"]] = relationship(  # noqa: F821
        "TimeEntry", back_populates="user", lazy="raise"
    )
    expenses: Mapped[list["Expense"]] = relationship(  # noqa: F821
        "Expense", back_populates="user", lazy="raise"
    )

    def has_role(self, minimum: Role) -> bool:
        return role_at_least(self.role, minimum)

    @property
    def is_admin(self) -> bool:
        """Server administrator (backups/restore), configured via ADMIN_EMAILS."""
        return self.email.lower() in settings.admin_emails
