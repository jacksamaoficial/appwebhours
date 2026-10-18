from __future__ import annotations

from typing import Annotated

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # App
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Public sign-up (creates a new business). Turn off in production once the
    # owner account exists: otherwise anyone can create an account.
    ALLOW_REGISTRATION: bool = True

    # Backups (pg_dump custom format files)
    BACKUP_DIR: str = "backups"
    # Comma-separated emails allowed into the admin panel (backup / restore)
    ADMIN_EMAILS: str = ""

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        # The placeholder from .env.example / docker-compose.yml is public: anyone
        # could sign valid tokens with it.
        if v.lower().startswith("changeme"):
            raise ValueError("SECRET_KEY is the example value; generate one: openssl rand -hex 32")
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def admin_emails(self) -> set[str]:
        return {e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()}

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


settings = Settings()  # type: ignore[call-arg]
