from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import require_role
from app.core.database import get_db
from app.models.user import Role, User
from app.schemas.payroll import EmployeePayroll, PayScheduleResponse, PayScheduleUpdate
from app.services.payroll import PayrollService

router = APIRouter(tags=["payroll"])

_owner_only = require_role(Role.OWNER)


@router.get("/employees/{user_id}/pay-schedule", response_model=PayScheduleResponse)
async def get_pay_schedule(
    user_id: uuid.UUID,
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> PayScheduleResponse:
    service = PayrollService(db)
    try:
        return await service.get_schedule(current_user.business_id, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/employees/{user_id}/pay-schedule", response_model=PayScheduleResponse)
async def set_pay_schedule(
    user_id: uuid.UUID,
    data: PayScheduleUpdate,
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> PayScheduleResponse:
    service = PayrollService(db)
    try:
        return await service.set_schedule(current_user.business_id, user_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/payroll", response_model=list[EmployeePayroll])
async def payroll_report(
    from_date: date = Query(),
    to_date: date = Query(),
    user_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> list[EmployeePayroll]:
    service = PayrollService(db)
    return await service.report(current_user.business_id, from_date, to_date, user_id=user_id)
