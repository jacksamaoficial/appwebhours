from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, require_role
from app.core.database import get_db
from app.models.user import Role, User
from app.schemas.business import BusinessResponse, BusinessUpdate
from app.services.business import BusinessService

router = APIRouter(prefix="/business", tags=["business"])


@router.get("", response_model=BusinessResponse)
async def get_business(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BusinessResponse:
    service = BusinessService(db)
    return BusinessResponse.model_validate(await service.get_business(current_user.business_id))


@router.patch("", response_model=BusinessResponse)
async def update_business(
    data: BusinessUpdate,
    current_user: User = Depends(require_role(Role.OWNER)),
    db: AsyncSession = Depends(get_db),
) -> BusinessResponse:
    service = BusinessService(db)
    business = await service.update_business(current_user.business_id, data)
    return BusinessResponse.model_validate(business)
