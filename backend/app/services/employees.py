from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import Role, User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.payroll import PayrollService, assert_no_overlap, bands_from_input


class EmployeeService:
    """Owner-side management of the people who work in the business."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_employees(self, business_id: uuid.UUID) -> list[User]:
        stmt = (
            select(User)
            .where(User.business_id == business_id)
            .order_by(User.is_active.desc(), User.full_name)
        )
        result = await self._db.scalars(stmt)
        return list(result.all())

    async def create_employee(self, business_id: uuid.UUID, data: EmployeeCreate) -> User:
        existing = await self._db.scalar(select(User).where(User.email == data.email))
        if existing is not None:
            raise ValueError("Email already registered")
        # Validate before creating anything, so a bad schedule creates no account.
        if data.pay_schedule is not None:
            assert_no_overlap(bands_from_input(data.pay_schedule.bands))
        user = User(
            business_id=business_id,
            role=data.role.value,
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
        )
        self._db.add(user)
        await self._db.flush()
        if data.pay_schedule is not None:
            await PayrollService(self._db).set_schedule(business_id, user.id, data.pay_schedule)
        return user

    async def get_employee(self, business_id: uuid.UUID, user_id: uuid.UUID) -> User:
        user = await self._db.get(User, user_id)
        if user is None or user.business_id != business_id:
            raise ValueError("Employee not found")
        return user

    async def update_employee(
        self, business_id: uuid.UUID, user_id: uuid.UUID, data: EmployeeUpdate
    ) -> User:
        user = await self.get_employee(business_id, user_id)
        if user.role == Role.OWNER.value and (data.role is not None or data.is_active is False):
            raise ValueError("The owner's role and status cannot be changed")
        values = data.model_dump(exclude_unset=True)
        password = values.pop("password", None)
        if password is not None:
            user.hashed_password = hash_password(password)
            user.token_version += 1  # sign out everywhere
        if "role" in values and values["role"] is not None:
            values["role"] = values["role"].value
        for field, value in values.items():
            if value is not None:
                setattr(user, field, value)
        await self._db.flush()
        return user
