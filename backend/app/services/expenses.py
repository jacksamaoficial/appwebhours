from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense
from app.models.job import Job
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.business_days import assert_day_open


class ExpenseService:
    """Expenses belong to the business: everyone allowed to manage them sees all."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _assert_job_in_business(self, business_id: uuid.UUID, job_id: uuid.UUID) -> None:
        job = await self._db.get(Job, job_id)
        if job is None or job.business_id != business_id:
            raise ValueError("Job not found")

    async def list_expenses(
        self,
        business_id: uuid.UUID,
        from_date: date | None = None,
        to_date: date | None = None,
        job_id: uuid.UUID | None = None,
    ) -> list[Expense]:
        stmt = select(Expense).where(Expense.business_id == business_id)
        if from_date:
            stmt = stmt.where(Expense.date >= from_date)
        if to_date:
            stmt = stmt.where(Expense.date <= to_date)
        if job_id:
            stmt = stmt.where(Expense.job_id == job_id)
        stmt = stmt.order_by(Expense.date.desc())
        result = await self._db.scalars(stmt)
        return list(result.all())

    async def create_expense(self, actor: User, data: ExpenseCreate) -> Expense:
        if data.job_id is not None:
            await self._assert_job_in_business(actor.business_id, data.job_id)
        await assert_day_open(self._db, actor.business_id, data.date)
        expense = Expense(business_id=actor.business_id, user_id=actor.id, **data.model_dump())
        self._db.add(expense)
        await self._db.flush()
        return expense

    async def get_expense(self, business_id: uuid.UUID, expense_id: uuid.UUID) -> Expense:
        expense = await self._db.get(Expense, expense_id)
        if expense is None or expense.business_id != business_id:
            raise ValueError("Expense not found")
        return expense

    async def update_expense(
        self, business_id: uuid.UUID, expense_id: uuid.UUID, data: ExpenseUpdate
    ) -> Expense:
        expense = await self.get_expense(business_id, expense_id)
        await assert_day_open(self._db, business_id, expense.date)
        if data.date is not None and data.date != expense.date:
            await assert_day_open(self._db, business_id, data.date)
        if data.job_id is not None:
            await self._assert_job_in_business(business_id, data.job_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(expense, field, value)
        await self._db.flush()
        return expense

    async def delete_expense(self, business_id: uuid.UUID, expense_id: uuid.UUID) -> None:
        expense = await self.get_expense(business_id, expense_id)
        await assert_day_open(self._db, business_id, expense.date)
        await self._db.delete(expense)
        await self._db.flush()
