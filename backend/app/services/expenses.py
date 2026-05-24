from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense
from app.models.job import Job
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


class ExpenseService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _assert_job_owned(self, user_id: uuid.UUID, job_id: uuid.UUID) -> None:
        job = await self._db.get(Job, job_id)
        if job is None or job.user_id != user_id:
            raise ValueError("Job not found")

    async def list_expenses(
        self,
        user_id: uuid.UUID,
        from_date: date | None = None,
        to_date: date | None = None,
        job_id: uuid.UUID | None = None,
    ) -> list[Expense]:
        stmt = select(Expense).where(Expense.user_id == user_id)
        if from_date:
            stmt = stmt.where(Expense.date >= from_date)
        if to_date:
            stmt = stmt.where(Expense.date <= to_date)
        if job_id:
            stmt = stmt.where(Expense.job_id == job_id)
        stmt = stmt.order_by(Expense.date.desc())
        result = await self._db.scalars(stmt)
        return list(result.all())

    async def create_expense(self, user_id: uuid.UUID, data: ExpenseCreate) -> Expense:
        if data.job_id is not None:
            await self._assert_job_owned(user_id, data.job_id)
        expense = Expense(user_id=user_id, **data.model_dump())
        self._db.add(expense)
        await self._db.flush()
        return expense

    async def get_expense(self, user_id: uuid.UUID, expense_id: uuid.UUID) -> Expense:
        expense = await self._db.get(Expense, expense_id)
        if expense is None or expense.user_id != user_id:
            raise ValueError("Expense not found")
        return expense

    async def update_expense(
        self, user_id: uuid.UUID, expense_id: uuid.UUID, data: ExpenseUpdate
    ) -> Expense:
        expense = await self.get_expense(user_id, expense_id)
        if data.job_id is not None:
            await self._assert_job_owned(user_id, data.job_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(expense, field, value)
        await self._db.flush()
        return expense

    async def delete_expense(self, user_id: uuid.UUID, expense_id: uuid.UUID) -> None:
        expense = await self.get_expense(user_id, expense_id)
        await self._db.delete(expense)
        await self._db.flush()
