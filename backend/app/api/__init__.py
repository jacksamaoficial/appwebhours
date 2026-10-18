from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.business import router as business_router
from app.api.business_days import router as business_days_router
from app.api.employees import router as employees_router
from app.api.expenses import router as expenses_router
from app.api.jobs import router as jobs_router
from app.api.payroll import router as payroll_router
from app.api.time_entries import router as time_entries_router

__all__ = [
    "admin_router",
    "auth_router",
    "business_router",
    "business_days_router",
    "employees_router",
    "jobs_router",
    "payroll_router",
    "time_entries_router",
    "expenses_router",
]
