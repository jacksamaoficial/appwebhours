from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import Role


def validate_password_complexity(v: str) -> str:
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one digit")
    if not any(c.isalpha() for c in v):
        raise ValueError("Password must contain at least one letter")
    return v


class RegisterRequest(BaseModel):
    """Public sign-up: creates a new business with the caller as its owner."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    business_name: str = Field(min_length=1, max_length=200)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        return validate_password_complexity(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    business_id: uuid.UUID
    role: Role
    is_admin: bool = False
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
