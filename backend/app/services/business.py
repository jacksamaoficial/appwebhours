from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.schemas.business import BusinessUpdate


class BusinessService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_business(self, business_id: uuid.UUID) -> Business:
        business = await self._db.get(Business, business_id)
        if business is None:
            raise ValueError("Business not found")
        return business

    async def update_business(self, business_id: uuid.UUID, data: BusinessUpdate) -> Business:
        business = await self.get_business(business_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(business, field, value)
        await self._db.flush()
        return business
