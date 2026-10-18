from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import Role
from app.schemas.auth import validate_password_complexity
from app.schemas.payroll import PayScheduleUpdate


# There is a single owner per business: employees get any role but OWNER.
def _reject_owner(v: Role | None) -> Role | None:
    if v == Role.OWNER:
        raise ValueError("The owner role cannot be assigned to employees")
    return v


class EmployeeCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.HOURS
    # Optional: set the schedule and pay rates in the same step
    pay_schedule: PayScheduleUpdate | None = None

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        return validate_password_complexity(v)

    @field_validator("role")
    @classmethod
    def not_owner(cls, v: Role) -> Role:
        return _reject_owner(v)  # type: ignore[return-value]


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    role: Role | None = None
    is_active: bool | None = None
    # Password reset by the owner
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str | None) -> str | None:
        return validate_password_complexity(v) if v is not None else v

    @field_validator("role")
    @classmethod
    def not_owner(cls, v: Role | None) -> Role | None:
        return _reject_owner(v)
