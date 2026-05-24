from __future__ import annotations

import uuid
from datetime import date as dt_date
from datetime import datetime, time

from pydantic import BaseModel, Field, model_validator


class TimeEntryCreate(BaseModel):
    job_id: uuid.UUID
    date: dt_date
    start_time: time
    end_time: time | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def end_after_start(self) -> "TimeEntryCreate":
        if self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class TimeEntryUpdate(BaseModel):
    job_id: uuid.UUID | None = None
    date: dt_date | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = Field(default=None, max_length=2000)


class TimeEntryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    job_id: uuid.UUID
    date: dt_date
    start_time: time
    end_time: time | None
    duration_minutes: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
