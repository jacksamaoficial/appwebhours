from __future__ import annotations

import uuid
from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, Field, computed_field


class DailySalesUpdate(BaseModel):
    cash: float = Field(default=0, ge=0)
    card: float = Field(default=0, ge=0)
    cash_out: float = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class BusinessDayResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID | None
    date: dt_date
    cash: float
    card: float
    cash_out: float
    notes: str | None
    is_closed: bool
    closed_at: datetime | None
    closed_by_id: uuid.UUID | None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total(self) -> float:
        """Net total for the day: cash + card - cash taken out of the till."""
        return round(self.cash + self.card - self.cash_out, 2)


class DayStatusResponse(BaseModel):
    """Closed/open status, visible to every role (no sales figures)."""

    date: dt_date
    is_closed: bool
