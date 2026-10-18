from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import require_role
from app.core.database import get_db
from app.models.user import Role, User
from app.schemas.auth import UserResponse
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.employees import EmployeeService
from app.services.payroll import InvalidScheduleError

router = APIRouter(prefix="/employees", tags=["employees"])

_owner_only = require_role(Role.OWNER)


@router.get("", response_model=list[UserResponse])
async def list_employees(
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    service = EmployeeService(db)
    users = await service.list_employees(current_user.business_id)
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = EmployeeService(db)
    try:
        user = await service.create_employee(current_user.business_id, data)
    except InvalidScheduleError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_employee(
    user_id: uuid.UUID,
    data: EmployeeUpdate,
    current_user: User = Depends(_owner_only),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    service = EmployeeService(db)
    try:
        user = await service.update_employee(current_user.business_id, user_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return UserResponse.model_validate(user)
