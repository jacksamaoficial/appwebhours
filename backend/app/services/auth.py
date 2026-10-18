from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    burn_password_check,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.business import Business
from app.models.user import Role, User
from app.schemas.auth import RegisterRequest


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def register(self, data: RegisterRequest) -> tuple[User, str, str]:
        existing = await self._db.scalar(select(User).where(User.email == data.email))
        if existing is not None:
            raise ValueError("Email already registered")

        business = Business(name=data.business_name)
        self._db.add(business)
        await self._db.flush()

        user = User(
            business_id=business.id,
            role=Role.OWNER.value,
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
        )
        self._db.add(user)
        await self._db.flush()  # get the id before commit

        access_token = create_access_token(str(user.id), user.token_version)
        refresh_token = create_refresh_token(str(user.id), user.token_version)
        return user, access_token, refresh_token

    async def login(self, email: str, password: str) -> tuple[User, str, str]:
        user = await self._db.scalar(select(User).where(User.email == email))
        if user is None:
            burn_password_check(password)
            raise ValueError("Invalid email or password")
        if not verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is disabled")

        access_token = create_access_token(str(user.id), user.token_version)
        refresh_token = create_refresh_token(str(user.id), user.token_version)
        return user, access_token, refresh_token

    async def refresh(self, refresh_token: str) -> str:
        claims = decode_token(refresh_token, expected_type="refresh")
        user = await self._db.get(User, uuid.UUID(claims.user_id))
        if user is None or not user.is_active:
            raise ValueError("User not found or inactive")
        if claims.version != user.token_version:
            raise ValueError("Session revoked")
        return create_access_token(str(user.id), user.token_version)

    async def get_by_id(self, user_id: uuid.UUID) -> User:
        user = await self._db.get(User, user_id)
        if user is None:
            raise ValueError("User not found")
        return user
