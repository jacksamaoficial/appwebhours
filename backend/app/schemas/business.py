from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    currency: str | None = Field(default=None, min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def currency_uppercase(cls, v: str | None) -> str | None:
        return v.upper() if v else v


class BusinessResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    currency: str
    created_at: datetime
