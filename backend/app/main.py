from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import (
    admin_router,
    auth_router,
    business_days_router,
    business_router,
    employees_router,
    expenses_router,
    jobs_router,
    payroll_router,
    time_entries_router,
)
from app.core.config import settings
from app.core.database import engine
from app.core.rate_limit import limiter
from app.services.business_days import DayClosedError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: nothing needed — Alembic handles migrations
    yield
    # Shutdown: dispose the connection pool
    await engine.dispose()


app = FastAPI(
    title="App Control de Horas y Gastos",
    version="0.1.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]


@app.exception_handler(DayClosedError)
async def day_closed_handler(_request: Request, exc: DayClosedError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(exc)})


@app.exception_handler(PermissionError)
async def permission_error_handler(_request: Request, exc: PermissionError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": str(exc)})


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"], include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

PREFIX = settings.API_V1_PREFIX

app.include_router(auth_router, prefix=PREFIX)
app.include_router(jobs_router, prefix=PREFIX)
app.include_router(time_entries_router, prefix=PREFIX)
app.include_router(expenses_router, prefix=PREFIX)
app.include_router(business_router, prefix=PREFIX)
app.include_router(business_days_router, prefix=PREFIX)
app.include_router(employees_router, prefix=PREFIX)
app.include_router(payroll_router, prefix=PREFIX)
app.include_router(admin_router, prefix=PREFIX)
