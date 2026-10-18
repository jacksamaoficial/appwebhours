from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, time
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pay_band import PayBand
from app.models.time_entry import TimeEntry
from app.models.user import Role, User
from app.schemas.payroll import (
    BandWork,
    EmployeePayroll,
    PayBandIn,
    PayBandResponse,
    PayrollEntry,
    PayScheduleResponse,
    PayScheduleUpdate,
)

_DAY = 24 * 60


def _minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _span(start: time, end: time) -> tuple[int, int]:
    """[start, end) in minutes from midnight; end <= start means next day."""
    s, e = _minutes(start), _minutes(end)
    return s, e if e > s else e + _DAY


def _overlap(a: tuple[int, int], b: tuple[int, int]) -> int:
    return max(0, min(a[1], b[1]) - max(a[0], b[0]))


def _money(minutes: int, rate: Decimal) -> Decimal:
    return (Decimal(minutes) / 60 * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class Band:
    start_time: time
    end_time: time
    hourly_rate: Decimal


def split_shift(start: time, end: time, bands: list[Band]) -> tuple[list[int], int]:
    """Minutes of a shift that fall in each band, plus the overtime minutes.

    Bands repeat every day, so the shift is compared against each band on the
    previous day, the same day and the next day (a 01:00 start still falls in
    yesterday's 22:00-02:00 band).
    """
    shift = _span(start, end)
    per_band = []
    for band in bands:
        b_start, b_end = _span(band.start_time, band.end_time)
        per_band.append(
            sum(_overlap(shift, (b_start + off, b_end + off)) for off in (-_DAY, 0, _DAY))
        )
    overtime = (shift[1] - shift[0]) - sum(per_band)
    return per_band, overtime


class InvalidScheduleError(ValueError):
    """The pay schedule sent by the owner is not valid (e.g. overlapping bands)."""


def bands_from_input(bands: list[PayBandIn]) -> list[Band]:
    return [Band(b.start_time, b.end_time, Decimal(str(b.hourly_rate))) for b in bands]


def assert_no_overlap(bands: list[Band]) -> None:
    used = [False] * _DAY
    for band in bands:
        b_start, b_end = _span(band.start_time, band.end_time)
        for m in range(b_start, b_end):
            if used[m % _DAY]:
                raise InvalidScheduleError("Pay bands overlap")
            used[m % _DAY] = True


class PayrollService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _get_employee(self, business_id: uuid.UUID, user_id: uuid.UUID) -> User:
        user = await self._db.get(User, user_id)
        if user is None or user.business_id != business_id:
            raise ValueError("Employee not found")
        return user

    async def _bands_by_user(self, business_id: uuid.UUID) -> dict[uuid.UUID, list[PayBand]]:
        result = await self._db.scalars(
            select(PayBand)
            .where(PayBand.business_id == business_id)
            .order_by(PayBand.start_time)
        )
        by_user: dict[uuid.UUID, list[PayBand]] = {}
        for band in result.all():
            by_user.setdefault(band.user_id, []).append(band)
        return by_user

    async def get_schedule(
        self, business_id: uuid.UUID, user_id: uuid.UUID
    ) -> PayScheduleResponse:
        user = await self._get_employee(business_id, user_id)
        bands = (await self._bands_by_user(business_id)).get(user_id, [])
        return PayScheduleResponse(
            user_id=user.id,
            bands=[PayBandResponse.model_validate(b) for b in bands],
            overtime_rate=user.overtime_rate,
        )

    async def set_schedule(
        self, business_id: uuid.UUID, user_id: uuid.UUID, data: PayScheduleUpdate
    ) -> PayScheduleResponse:
        user = await self._get_employee(business_id, user_id)
        assert_no_overlap(bands_from_input(data.bands))
        await self._db.execute(delete(PayBand).where(PayBand.user_id == user_id))
        for band in data.bands:
            self._db.add(PayBand(business_id=business_id, user_id=user_id, **band.model_dump()))
        user.overtime_rate = data.overtime_rate
        await self._db.flush()
        return await self.get_schedule(business_id, user_id)

    async def report(
        self,
        business_id: uuid.UUID,
        from_date: date,
        to_date: date,
        user_id: uuid.UUID | None = None,
    ) -> list[EmployeePayroll]:
        users_stmt = select(User).where(User.business_id == business_id)
        if user_id:
            users_stmt = users_stmt.where(User.id == user_id)
        users = list((await self._db.scalars(users_stmt.order_by(User.full_name))).all())

        entries_stmt = select(TimeEntry).where(
            TimeEntry.business_id == business_id,
            TimeEntry.date >= from_date,
            TimeEntry.date <= to_date,
        )
        if user_id:
            entries_stmt = entries_stmt.where(TimeEntry.user_id == user_id)
        entries = (
            await self._db.scalars(entries_stmt.order_by(TimeEntry.date, TimeEntry.start_time))
        ).all()
        bands_by_user = await self._bands_by_user(business_id)

        report = []
        for user in users:
            user_entries = [e for e in entries if e.user_id == user.id]
            stored_bands = bands_by_user.get(user.id, [])
            # Without a schedule, the owner is not on payroll; nor is anyone with no hours.
            if not stored_bands and (user.role == Role.OWNER.value or not user_entries):
                continue
            report.append(self._employee_payroll(user, stored_bands, user_entries))
        return report

    def _employee_payroll(
        self, user: User, stored_bands: list[PayBand], entries: list[TimeEntry]
    ) -> EmployeePayroll:
        bands = [Band(b.start_time, b.end_time, Decimal(str(b.hourly_rate))) for b in stored_bands]
        ot_rate = Decimal(str(user.overtime_rate)) if user.overtime_rate is not None else Decimal(0)
        band_minutes = [0] * len(bands)
        rows: list[PayrollEntry] = []
        open_entries = 0

        for entry in entries:
            if entry.end_time is None:
                open_entries += 1
                continue
            per_band, overtime = split_shift(entry.start_time, entry.end_time, bands)
            regular_pay = sum(
                (_money(m, b.hourly_rate) for m, b in zip(per_band, bands, strict=True)),
                Decimal(0),
            )
            overtime_pay = _money(overtime, ot_rate)
            for i, m in enumerate(per_band):
                band_minutes[i] += m
            rows.append(
                PayrollEntry(
                    entry_id=entry.id,
                    date=entry.date,
                    start_time=entry.start_time,
                    end_time=entry.end_time,
                    regular_minutes=sum(per_band),
                    overtime_minutes=overtime,
                    regular_pay=float(regular_pay),
                    overtime_pay=float(overtime_pay),
                    total_pay=float(regular_pay + overtime_pay),
                )
            )

        regular_pay = sum((Decimal(str(r.regular_pay)) for r in rows), Decimal(0))
        overtime_pay = sum((Decimal(str(r.overtime_pay)) for r in rows), Decimal(0))
        return EmployeePayroll(
            user_id=user.id,
            full_name=user.full_name,
            has_schedule=bool(bands),
            overtime_rate=user.overtime_rate,
            regular_minutes=sum(r.regular_minutes for r in rows),
            overtime_minutes=sum(r.overtime_minutes for r in rows),
            regular_pay=float(regular_pay),
            overtime_pay=float(overtime_pay),
            total_pay=float(regular_pay + overtime_pay),
            open_entries=open_entries,
            bands=[
                BandWork(
                    start_time=b.start_time,
                    end_time=b.end_time,
                    hourly_rate=float(b.hourly_rate),
                    minutes=m,
                    amount=float(_money(m, b.hourly_rate)),
                )
                for b, m in zip(bands, band_minutes, strict=True)
            ],
            entries=rows,
        )
