from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_day import BusinessDay
from app.schemas.business_day import DailySalesUpdate


class DayClosedError(Exception):
    """Raised when trying to modify data of a day the owner has closed."""

    def __init__(self, day: date) -> None:
        super().__init__(f"Day {day.isoformat()} is closed")
        self.day = day


async def assert_day_open(db: AsyncSession, business_id: uuid.UUID, day: date) -> None:
    closed = await db.scalar(
        select(BusinessDay.id).where(
            BusinessDay.business_id == business_id,
            BusinessDay.date == day,
            BusinessDay.is_closed.is_(True),
        )
    )
    if closed is not None:
        raise DayClosedError(day)


class BusinessDayService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _find(self, business_id: uuid.UUID, day: date) -> BusinessDay | None:
        return await self._db.scalar(
            select(BusinessDay).where(
                BusinessDay.business_id == business_id, BusinessDay.date == day
            )
        )

    async def _get_or_create(self, business_id: uuid.UUID, day: date) -> BusinessDay:
        business_day = await self._find(business_id, day)
        if business_day is None:
            business_day = BusinessDay(
                business_id=business_id, date=day, cash=0, card=0, cash_out=0, is_closed=False
            )
            self._db.add(business_day)
            await self._db.flush()
        return business_day

    async def list_days(
        self,
        business_id: uuid.UUID,
        from_date: date | None = None,
        to_date: date | None = None,
        closed_only: bool = False,
    ) -> list[BusinessDay]:
        stmt = select(BusinessDay).where(BusinessDay.business_id == business_id)
        if from_date:
            stmt = stmt.where(BusinessDay.date >= from_date)
        if to_date:
            stmt = stmt.where(BusinessDay.date <= to_date)
        if closed_only:
            stmt = stmt.where(BusinessDay.is_closed.is_(True))
        stmt = stmt.order_by(BusinessDay.date.desc())
        result = await self._db.scalars(stmt)
        return list(result.all())

    async def get_day(self, business_id: uuid.UUID, day: date) -> BusinessDay:
        """Return the stored day, or an unsaved empty one if nothing was recorded yet."""
        business_day = await self._find(business_id, day)
        if business_day is None:
            business_day = BusinessDay(
                business_id=business_id,
                date=day,
                cash=0,
                card=0,
                cash_out=0,
                notes=None,
                is_closed=False,
            )
        return business_day

    async def set_sales(
        self, business_id: uuid.UUID, day: date, data: DailySalesUpdate, user_id: uuid.UUID
    ) -> BusinessDay:
        business_day = await self._get_or_create(business_id, day)
        if business_day.is_closed:
            raise DayClosedError(day)
        for field, value in data.model_dump().items():
            setattr(business_day, field, value)
        business_day.updated_by_id = user_id
        await self._db.flush()
        return business_day

    async def close_day(
        self, business_id: uuid.UUID, day: date, user_id: uuid.UUID
    ) -> BusinessDay:
        business_day = await self._get_or_create(business_id, day)
        if not business_day.is_closed:
            business_day.is_closed = True
            business_day.closed_at = datetime.now(tz=timezone.utc)
            business_day.closed_by_id = user_id
            await self._db.flush()
        return business_day

    async def reopen_day(self, business_id: uuid.UUID, day: date) -> BusinessDay:
        business_day = await self._get_or_create(business_id, day)
        business_day.is_closed = False
        business_day.closed_at = None
        business_day.closed_by_id = None
        await self._db.flush()
        return business_day
