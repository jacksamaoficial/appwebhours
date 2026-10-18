from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.models.time_entry import TimeEntry
from app.models.user import Role, User
from app.schemas.time_entry import TimeEntryCreate, TimeEntryUpdate
from app.services.business_days import assert_day_open


def _calc_duration(entry: TimeEntry) -> None:
    """Compute and store duration_minutes when both times are present.

    An end_time at or before start_time means the shift crossed midnight.
    """
    if entry.start_time and entry.end_time:
        start_dt = datetime.combine(date.today(), entry.start_time)
        end_dt = datetime.combine(date.today(), entry.end_time)
        if end_dt <= start_dt:
            end_dt += timedelta(days=1)
        delta = end_dt - start_dt
        entry.duration_minutes = int(delta.total_seconds() // 60)
    else:
        entry.duration_minutes = None


class TimeEntryService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _assert_job_in_business(self, business_id: uuid.UUID, job_id: uuid.UUID) -> None:
        job = await self._db.get(Job, job_id)
        if job is None or job.business_id != business_id:
            raise ValueError("Job not found")

    async def _assert_employee_in_business(
        self, business_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        user = await self._db.get(User, user_id)
        if user is None or user.business_id != business_id:
            raise ValueError("Employee not found")

    async def list_entries(
        self,
        actor: User,
        user_id: uuid.UUID | None = None,
        entry_date: date | None = None,
        job_id: uuid.UUID | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[TimeEntry]:
        stmt = select(TimeEntry).where(TimeEntry.business_id == actor.business_id)
        # Employees only see their own hours; the owner sees everyone's.
        if not actor.has_role(Role.OWNER):
            stmt = stmt.where(TimeEntry.user_id == actor.id)
        elif user_id:
            stmt = stmt.where(TimeEntry.user_id == user_id)
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

    async def create_entry(self, actor: User, data: TimeEntryCreate) -> TimeEntry:
        target_user_id = data.user_id or actor.id
        if target_user_id != actor.id:
            if not actor.has_role(Role.OWNER):
                raise PermissionError("Only the owner can record hours for other employees")
            await self._assert_employee_in_business(actor.business_id, target_user_id)
        await self._assert_job_in_business(actor.business_id, data.job_id)
        await assert_day_open(self._db, actor.business_id, data.date)

        entry = TimeEntry(
            business_id=actor.business_id,
            user_id=target_user_id,
            **data.model_dump(exclude={"user_id"}),
        )
        _calc_duration(entry)
        self._db.add(entry)
        await self._db.flush()
        return entry

    async def get_entry(self, actor: User, entry_id: uuid.UUID) -> TimeEntry:
        entry = await self._db.get(TimeEntry, entry_id)
        if (
            entry is None
            or entry.business_id != actor.business_id
            or (entry.user_id != actor.id and not actor.has_role(Role.OWNER))
        ):
            raise ValueError("Time entry not found")
        return entry

    async def update_entry(
        self, actor: User, entry_id: uuid.UUID, data: TimeEntryUpdate
    ) -> TimeEntry:
        entry = await self.get_entry(actor, entry_id)
        await assert_day_open(self._db, actor.business_id, entry.date)
        if data.date is not None and data.date != entry.date:
            await assert_day_open(self._db, actor.business_id, data.date)
        if data.job_id is not None:
            await self._assert_job_in_business(actor.business_id, data.job_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(entry, field, value)
        if entry.end_time is not None and entry.end_time == entry.start_time:
            raise ValueError("end_time must differ from start_time")
        _calc_duration(entry)
        await self._db.flush()
        return entry

    async def delete_entry(self, actor: User, entry_id: uuid.UUID) -> None:
        entry = await self.get_entry(actor, entry_id)
        await assert_day_open(self._db, actor.business_id, entry.date)
        await self._db.delete(entry)
        await self._db.flush()
