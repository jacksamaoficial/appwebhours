from __future__ import annotations

import uuid
from datetime import date as dt_date
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class ExpenseCategory(str, Enum):
    TRANSPORT = "transport"
    FOOD = "food"
    EQUIPMENT = "equipment"
    SOFTWARE = "software"
    OFFICE = "office"
    OTHER = "other"


class ExpenseCreate(BaseModel):
    job_id: uuid.UUID | None = None
    date: dt_date
    amount: float = Field(gt=0)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    category: ExpenseCategory = ExpenseCategory.OTHER
    description: str = Field(min_length=1, max_length=1000)

    @field_validator("currency")
    @classmethod
    def currency_uppercase(cls, v: str) -> str:
        return v.upper()


class ExpenseUpdate(BaseModel):
    job_id: uuid.UUID | None = None
    date: dt_date | None = None
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    category: ExpenseCategory | None = None
    description: str | None = Field(default=None, min_length=1, max_length=1000)

    @field_validator("currency")
    @classmethod
    def currency_uppercase(cls, v: str | None) -> str | None:
        return v.upper() if v else v


class ExpenseResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    job_id: uuid.UUID | None
    date: dt_date
    amount: float
    currency: str
    category: str
    description: str
    created_at: datetime
    updated_at: datetime
