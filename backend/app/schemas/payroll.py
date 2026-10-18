from __future__ import annotations

import uuid
from datetime import date as dt_date
from datetime import time

from pydantic import BaseModel, Field, model_validator


class PayBandIn(BaseModel):
    start_time: time
    end_time: time  # at or before start_time = crosses midnight
    hourly_rate: float = Field(ge=0)

    @model_validator(mode="after")
    def end_differs_from_start(self) -> "PayBandIn":
        if self.end_time == self.start_time:
            raise ValueError("end_time must differ from start_time")
        return self


class PayBandResponse(PayBandIn):
    model_config = {"from_attributes": True}

    id: uuid.UUID


class PayScheduleUpdate(BaseModel):
    """Replaces the whole schedule of an employee."""

    bands: list[PayBandIn] = Field(default_factory=list, max_length=12)
    overtime_rate: float | None = Field(default=None, ge=0)


class PayScheduleResponse(BaseModel):
    user_id: uuid.UUID
    bands: list[PayBandResponse]
    overtime_rate: float | None


class BandWork(BaseModel):
    start_time: time
    end_time: time
    hourly_rate: float
    minutes: int
    amount: float


class PayrollEntry(BaseModel):
    entry_id: uuid.UUID
    date: dt_date
    start_time: time
    end_time: time
    regular_minutes: int
    overtime_minutes: int
    regular_pay: float
    overtime_pay: float
    total_pay: float


class EmployeePayroll(BaseModel):
    user_id: uuid.UUID
    full_name: str
    has_schedule: bool
    overtime_rate: float | None
    regular_minutes: int
    overtime_minutes: int
    regular_pay: float
    overtime_pay: float
    total_pay: float
    # Entries still in progress (no end_time) are not paid yet
    open_entries: int
    bands: list[BandWork]
    entries: list[PayrollEntry]
