from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, require_role
from app.core.database import get_db
from app.models.user import Role, User
from app.schemas.business_day import BusinessDayResponse, DailySalesUpdate, DayStatusResponse
from app.services.business_days import BusinessDayService

router = APIRouter(prefix="/business-days", tags=["business-days"])

_can_manage_sales = require_role(Role.HOURS_EXPENSES_SALES)
_owner_only = require_role(Role.OWNER)


@router.get("/closed", response_model=list[DayStatusResponse])
async def list_closed_days(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DayStatusResponse]:
    """Closed days, visible to every role so the UI can lock editing."""
    service = BusinessDayService(db)
    days = await service.list_days(
        current_user.business_id, from_date=from_date, to_date=to_date, closed_only=True
    )
    return [DayStatusResponse(date=d.date, is_closed=d.is_closed) for d in days]


@router.get("", response_model=list[BusinessDayResponse])
async def list_days(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    current_user: User = Depends(_can_manage_sales),
    db: AsyncSession = Depends(get_db),
) -> list[BusinessDayResponse]:
    service = BusinessDayService(db)
    days = await service.list_days(current_user.business_id, from_date=from_date, to_date=to_date)
    return [BusinessDayResponse.model_validate(d) for d in days]


@router.get("/{day}", response_model=BusinessDayResponse)
async def get_day(
    day: date,
    current_user: User = Depends(_can_manage_sales),
    db: AsyncSession = Depends(get_db),
) -> BusinessDayResponse:
    service = BusinessDayService(db)
    return BusinessDayResponse.model_validate(await service.get_day(current_user.business_id, day))


@router.put("/{day}/sales", response_model=BusinessDayResponse)
async def set_sales(
    day: date,
    data: DailySalesUpdate,
    current_user: User = Depends(_can_manage_sales),
    db: AsyncSession = Depends(get_db),
) -> BusinessDayResponse:
    service = BusinessDayService(db)
    business_day = await service.set_sales(current_user.business_id, day, data, current_user.id)
    return BusinessDayResponse.model_validate(business_day)


@router.post("/{day}/close", response_model=BusinessDayResponse)
async def close_day(
    day: date,
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> BusinessDayResponse:
    service = BusinessDayService(db)
    business_day = await service.close_day(current_user.business_id, day, current_user.id)
    return BusinessDayResponse.model_validate(business_day)


@router.post("/{day}/reopen", response_model=BusinessDayResponse)
async def reopen_day(
    day: date,
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> BusinessDayResponse:
    service = BusinessDayService(db)
    business_day = await service.reopen_day(current_user.business_id, day)
    return BusinessDayResponse.model_validate(business_day)
