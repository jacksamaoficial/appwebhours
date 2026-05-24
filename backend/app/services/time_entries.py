from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.models.time_entry import TimeEntry
from app.schemas.time_entry import TimeEntryCreate, TimeEntryUpdate


def _calc_duration(entry: TimeEntry) -> None:
    """Compute and store duration_minutes when both times are present."""
    if entry.start_time and entry.end_time:
        start_dt = datetime.combine(date.today(), entry.start_time)
        end_dt = datetime.combine(date.today(), entry.end_time)
        delta = end_dt - start_dt
        entry.duration_minutes = int(delta.total_seconds() // 60)
    else:
        entry.duration_minutes = None


class TimeEntryService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _assert_job_owned(self, user_id: uuid.UUID, job_id: uuid.UUID) -> None:
        job = await self._db.get(Job, job_id)
        if job is None or job.user_id != user_id:
            raise ValueError("Job not found")

    async def list_entries(
        self,
        user_id: uuid.UUID,
        entry_date: date | None = None,
        job_id: uuid.UUID | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[TimeEntry]:
        stmt = select(TimeEntry).where(TimeEntry.user_id == user_id)
        if entry_date:
            stmt = stmt.where(TimeEntry.date == entry_date)
        if job_id:
            stmt = stmt.where(TimeEntry.job_id == job_id)
        if from_date:
            stmt = stmt.where(TimeEntry.date >= from_date)
        if to_date:
            stmt = stmt.where(TimeEntry.date <= to_date)
        stmt = stmt.order_by(TimeEntry.date.desc(), TimeEntry.start_time)
        result = await self._db.scalars(stmt)
        return list(result.all())

    async def create_entry(self, user_id: uuid.UUID, data: TimeEntryCreate) -> TimeEntry:
        await self._assert_job_owned(user_id, data.job_id)
        entry = TimeEntry(user_id=user_id, **data.model_dump())
        _calc_duration(entry)
        self._db.add(entry)
        await self._db.flush()
        return entry

    async def get_entry(self, user_id: uuid.UUID, entry_id: uuid.UUID) -> TimeEntry:
        entry = await self._db.get(TimeEntry, entry_id)
        if entry is None or entry.user_id != user_id:
            raise ValueError("Time entry not found")
        return entry

    async def update_entry(
        self, user_id: uuid.UUID, entry_id: uuid.UUID, data: TimeEntryUpdate
    ) -> TimeEntry:
        entry = await self.get_entry(user_id, entry_id)
        if data.job_id is not None:
            await self._assert_job_owned(user_id, data.job_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(entry, field, value)
        _calc_duration(entry)
        await self._db.flush()
        return entry

    async def delete_entry(self, user_id: uuid.UUID, entry_id: uuid.UUID) -> None:
        entry = await self.get_entry(user_id, entry_id)
        await self._db.delete(entry)
        await self._db.flush()
