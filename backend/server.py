from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta, timezone
import httpx
import jwt
from jose import JWTError
import json
from jwt.algorithms import RSAAlgorithm

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production-finance-app-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Create the main app
app = FastAPI(title="Personal Finance & Multi-Work Dashboard API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===== MODELS =====

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "email"  # "google", "apple", "email"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    session_id: str = Field(default_factory=lambda: f"session_{uuid.uuid4().hex}")
    user_id: str
    session_token: str = Field(default_factory=lambda: f"token_{uuid.uuid4().hex}")
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Job(BaseModel):
    job_id: str = Field(default_factory=lambda: f"job_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    base_salary: float  # Monthly base salary
    hours_per_week: int  # Standard hours per week
    hourly_rate: float  # Extra hours rate
    standard_start: str = "16:00"  # HH:MM format
    standard_end: str = "20:00"  # HH:MM format
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobCreate(BaseModel):
    name: str
    base_salary: float
    hours_per_week: int
    hourly_rate: float
    standard_start: str = "16:00"
    standard_end: str = "20:00"

class JobUpdate(BaseModel):
    name: Optional[str] = None
    base_salary: Optional[float] = None
    hours_per_week: Optional[int] = None
    hourly_rate: Optional[float] = None
    standard_start: Optional[str] = None
    standard_end: Optional[str] = None
    is_active: Optional[bool] = None

class WorkEntry(BaseModel):
    entry_id: str = Field(default_factory=lambda: f"entry_{uuid.uuid4().hex[:12]}")
    user_id: str
    job_id: str
    date: str  # YYYY-MM-DD format
    start_time: str  # HH:MM format
    end_time: Optional[str] = None  # HH:MM format (can be next day like "00:30")
    is_next_day: bool = False  # True if end_time is past midnight
    regular_hours: float = 0
    extra_hours: float = 0
    regular_earnings: float = 0
    extra_earnings: float = 0
    total_earnings: float = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkEntryCreate(BaseModel):
    job_id: str
    date: str
    start_time: str
    end_time: Optional[str] = None
    is_next_day: bool = False
    notes: Optional[str] = None

class WorkEntryClose(BaseModel):
    end_time: str
    is_next_day: bool = False

class Expense(BaseModel):
    expense_id: str = Field(default_factory=lambda: f"expense_{uuid.uuid4().hex[:12]}")
    user_id: str
    date: str  # YYYY-MM-DD format
    category: str  # food, transport, entertainment, other
    description: str
    amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    date: str
    category: str
    description: str
    amount: float

class PushToken(BaseModel):
    token_id: str = Field(default_factory=lambda: f"token_{uuid.uuid4().hex[:12]}")
    user_id: str
    push_token: str
    platform: str  # ios, android
    device_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PushTokenCreate(BaseModel):
    push_token: str
    platform: str
    device_id: Optional[str] = None

# Auth Models
class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str

class EmailRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class GoogleAuthRequest(BaseModel):
    session_id: str

class AppleAuthRequest(BaseModel):
    identity_token: str
    user: str
    email: Optional[str] = None
    full_name: Optional[Dict[str, str]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ===== UTILITY FUNCTIONS =====

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def calculate_work_hours_and_earnings(job: dict, start_time: str, end_time: str, is_next_day: bool) -> dict:
    """Calculate regular and extra hours/earnings based on job settings"""
    
    # Parse times
    start_parts = start_time.split(":")
    end_parts = end_time.split(":")
    
    start_hour = int(start_parts[0])
    start_min = int(start_parts[1])
    end_hour = int(end_parts[0])
    end_min = int(end_parts[1])
    
    # Convert to decimal hours
    start_decimal = start_hour + start_min / 60
    end_decimal = end_hour + end_min / 60
    
    # If end time is next day, add 24 hours
    if is_next_day:
        end_decimal += 24
    
    # Calculate total worked hours
    total_hours = end_decimal - start_decimal
    
    # Parse job standard end time
    job_end_parts = job.get("standard_end", "20:00").split(":")
    job_end_hour = int(job_end_parts[0])
    job_end_min = int(job_end_parts[1])
    job_end_decimal = job_end_hour + job_end_min / 60
    
    # Calculate regular vs extra hours
    # Extra hours are anything after the standard end time
    if end_decimal > job_end_decimal:
        regular_hours = min(total_hours, job_end_decimal - start_decimal)
        extra_hours = end_decimal - job_end_decimal
    else:
        regular_hours = total_hours
        extra_hours = 0
    
    # Ensure non-negative
    regular_hours = max(0, regular_hours)
    extra_hours = max(0, extra_hours)
    
    # Calculate earnings
    # Regular hours are covered by base salary (prorated)
    # Extra hours are paid at hourly rate
    extra_earnings = extra_hours * job.get("hourly_rate", 7.50)
    
    # Daily base salary (monthly / ~22 working days)
    daily_base = job.get("base_salary", 638) / 22
    regular_earnings = daily_base if regular_hours > 0 else 0
    
    return {
        "regular_hours": round(regular_hours, 2),
        "extra_hours": round(extra_hours, 2),
        "regular_earnings": round(regular_earnings, 2),
        "extra_earnings": round(extra_earnings, 2),
        "total_earnings": round(regular_earnings + extra_earnings, 2)
    }

# ===== AUTHENTICATION ENDPOINTS =====

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_email(request: EmailRegisterRequest):
    """Register a new user with email/password"""
    # Check if user exists
    existing = await db.users.find_one({"email": request.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password (simple hash for demo - use bcrypt in production)
    import hashlib
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    # Create user
    user = User(
        email=request.email,
        name=request.name,
        auth_provider="email"
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = password_hash
    
    await db.users.insert_one(user_dict)
    
    # Create default job for new users
    default_job = Job(
        user_id=user.user_id,
        name="Trabajo Principal",
        base_salary=638.0,
        hours_per_week=20,
        hourly_rate=7.50,
        standard_start="16:00",
        standard_end="20:00"
    )
    await db.jobs.insert_one(default_job.model_dump())
    
    # Generate token
    access_token = create_access_token({"sub": user.user_id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_email(request: EmailLoginRequest):
    """Login with email/password"""
    import hashlib
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    user = await db.users.find_one(
        {"email": request.email, "password_hash": password_hash},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user["user_id"]})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture")
        }
    )

@api_router.post("/auth/google", response_model=TokenResponse)
async def auth_google(request: GoogleAuthRequest):
    """Authenticate with Google via Emergent OAuth"""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = response.json()
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Check if user exists
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing:
        # Update user
        await db.users.update_one(
            {"email": data["email"]},
            {"$set": {
                "name": data.get("name", existing.get("name")),
                "picture": data.get("picture"),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        user_id = existing["user_id"]
        user_name = data.get("name", existing.get("name"))
    else:
        # Create new user
        user = User(
            email=data["email"],
            name=data.get("name", "User"),
            picture=data.get("picture"),
            auth_provider="google"
        )
        await db.users.insert_one(user.model_dump())
        user_id = user.user_id
        user_name = user.name
        
        # Create default job
        default_job = Job(
            user_id=user_id,
            name="Trabajo Principal",
            base_salary=638.0,
            hours_per_week=20,
            hourly_rate=7.50,
            standard_start="16:00",
            standard_end="20:00"
        )
        await db.jobs.insert_one(default_job.model_dump())
    
    access_token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "user_id": user_id,
            "email": data["email"],
            "name": user_name,
            "picture": data.get("picture")
        }
    )

@api_router.post("/auth/apple", response_model=TokenResponse)
async def auth_apple(request: AppleAuthRequest):
    """Authenticate with Apple Sign-In"""
    try:
        # Verify Apple token
        async with httpx.AsyncClient() as http_client:
            # Fetch Apple's public keys
            response = await http_client.get("https://appleid.apple.com/auth/keys")
            jwks = response.json()
        
        # Get unverified header
        unverified_header = jwt.get_unverified_header(request.identity_token)
        kid = unverified_header.get('kid')
        
        # Find matching key
        public_key_data = None
        for key in jwks.get('keys', []):
            if key.get('kid') == kid:
                public_key_data = key
                break
        
        if not public_key_data:
            raise HTTPException(status_code=401, detail="Invalid Apple token")
        
        # Convert to RSA key and verify
        public_key = RSAAlgorithm.from_jwk(json.dumps(public_key_data))
        decoded = jwt.decode(
            request.identity_token,
            public_key,
            algorithms=['RS256'],
            options={"verify_aud": False}  # Skip audience check for flexibility
        )
        
        apple_user_id = decoded.get("sub")
        email = decoded.get("email") or request.email
        
    except Exception as e:
        logger.error(f"Apple auth error: {e}")
        raise HTTPException(status_code=401, detail="Apple authentication failed")
    
    # Check if user exists
    existing = await db.users.find_one(
        {"$or": [{"apple_user_id": apple_user_id}, {"email": email}]},
        {"_id": 0}
    )
    
    # Build name from request
    full_name = None
    if request.full_name:
        full_name = f"{request.full_name.get('givenName', '')} {request.full_name.get('familyName', '')}".strip()
    
    if existing:
        # Update user
        update_data = {"updated_at": datetime.now(timezone.utc)}
        if full_name:
            update_data["name"] = full_name
        if not existing.get("apple_user_id"):
            update_data["apple_user_id"] = apple_user_id
            
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": update_data})
        user_id = existing["user_id"]
        user_name = full_name or existing.get("name", "User")
    else:
        # Create new user
        user = User(
            email=email or f"{apple_user_id}@privaterelay.appleid.com",
            name=full_name or "Apple User",
            auth_provider="apple"
        )
        user_dict = user.model_dump()
        user_dict["apple_user_id"] = apple_user_id
        await db.users.insert_one(user_dict)
        user_id = user.user_id
        user_name = user.name
        
        # Create default job
        default_job = Job(
            user_id=user_id,
            name="Trabajo Principal",
            base_salary=638.0,
            hours_per_week=20,
            hourly_rate=7.50,
            standard_start="16:00",
            standard_end="20:00"
        )
        await db.jobs.insert_one(default_job.model_dump())
    
    access_token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "user_id": user_id,
            "email": email,
            "name": user_name,
            "picture": None
        }
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "picture": current_user.get("picture")
    }

# ===== JOB ENDPOINTS =====

@api_router.get("/jobs", response_model=List[dict])
async def get_jobs(current_user: dict = Depends(get_current_user)):
    """Get all jobs for the current user"""
    jobs = await db.jobs.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    return jobs

@api_router.post("/jobs", response_model=dict)
async def create_job(job_data: JobCreate, current_user: dict = Depends(get_current_user)):
    """Create a new job"""
    job = Job(
        user_id=current_user["user_id"],
        **job_data.model_dump()
    )
    await db.jobs.insert_one(job.model_dump())
    return job.model_dump()

@api_router.put("/jobs/{job_id}", response_model=dict)
async def update_job(job_id: str, job_data: JobUpdate, current_user: dict = Depends(get_current_user)):
    """Update a job"""
    job = await db.jobs.find_one(
        {"job_id": job_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = {k: v for k, v in job_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": update_data}
    )
    
    updated_job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    return updated_job

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a job"""
    result = await db.jobs.delete_one(
        {"job_id": job_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}

# ===== WORK ENTRY ENDPOINTS =====

@api_router.get("/work-entries", response_model=List[dict])
async def get_work_entries(
    current_user: dict = Depends(get_current_user),
    month: Optional[str] = None,  # YYYY-MM format
    job_id: Optional[str] = None
):
    """Get work entries for the current user"""
    query = {"user_id": current_user["user_id"]}
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
    if job_id:
        query["job_id"] = job_id
    
    entries = await db.work_entries.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return entries

@api_router.post("/work-entries", response_model=dict)
async def create_work_entry(entry_data: WorkEntryCreate, current_user: dict = Depends(get_current_user)):
    """Start a new work entry (clock in)"""
    # Verify job belongs to user
    job = await db.jobs.find_one(
        {"job_id": entry_data.job_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    entry = WorkEntry(
        user_id=current_user["user_id"],
        job_id=entry_data.job_id,
        date=entry_data.date,
        start_time=entry_data.start_time,
        end_time=entry_data.end_time,
        is_next_day=entry_data.is_next_day,
        notes=entry_data.notes
    )
    
    # If end_time provided, calculate earnings
    if entry_data.end_time:
        calc = calculate_work_hours_and_earnings(
            job, entry_data.start_time, entry_data.end_time, entry_data.is_next_day
        )
        entry.regular_hours = calc["regular_hours"]
        entry.extra_hours = calc["extra_hours"]
        entry.regular_earnings = calc["regular_earnings"]
        entry.extra_earnings = calc["extra_earnings"]
        entry.total_earnings = calc["total_earnings"]
    
    await db.work_entries.insert_one(entry.model_dump())
    return entry.model_dump()

@api_router.put("/work-entries/{entry_id}/close", response_model=dict)
async def close_work_entry(
    entry_id: str,
    close_data: WorkEntryClose,
    current_user: dict = Depends(get_current_user)
):
    """Close a work entry (clock out)"""
    entry = await db.work_entries.find_one(
        {"entry_id": entry_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Work entry not found")
    
    # Get job for calculations
    job = await db.jobs.find_one({"job_id": entry["job_id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Calculate earnings
    calc = calculate_work_hours_and_earnings(
        job, entry["start_time"], close_data.end_time, close_data.is_next_day
    )
    
    await db.work_entries.update_one(
        {"entry_id": entry_id},
        {"$set": {
            "end_time": close_data.end_time,
            "is_next_day": close_data.is_next_day,
            "regular_hours": calc["regular_hours"],
            "extra_hours": calc["extra_hours"],
            "regular_earnings": calc["regular_earnings"],
            "extra_earnings": calc["extra_earnings"],
            "total_earnings": calc["total_earnings"],
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_entry = await db.work_entries.find_one({"entry_id": entry_id}, {"_id": 0})
    return updated_entry

@api_router.delete("/work-entries/{entry_id}")
async def delete_work_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a work entry"""
    result = await db.work_entries.delete_one(
        {"entry_id": entry_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Work entry not found")
    return {"message": "Work entry deleted"}

# ===== EXPENSE ENDPOINTS =====

@api_router.get("/expenses", response_model=List[dict])
async def get_expenses(
    current_user: dict = Depends(get_current_user),
    month: Optional[str] = None  # YYYY-MM format
):
    """Get expenses for the current user"""
    query = {"user_id": current_user["user_id"]}
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return expenses

@api_router.post("/expenses", response_model=dict)
async def create_expense(expense_data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    """Create a new expense"""
    expense = Expense(
        user_id=current_user["user_id"],
        **expense_data.model_dump()
    )
    await db.expenses.insert_one(expense.model_dump())
    return expense.model_dump()

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an expense"""
    result = await db.expenses.delete_one(
        {"expense_id": expense_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ===== DASHBOARD/SUMMARY ENDPOINTS =====

@api_router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    month: Optional[str] = None  # YYYY-MM format
):
    """Get dashboard summary for the current month"""
    if not month:
        month = datetime.now().strftime("%Y-%m")
    
    # Get all work entries for the month
    work_entries = await db.work_entries.find(
        {"user_id": current_user["user_id"], "date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(1000)
    
    # Get all expenses for the month
    expenses = await db.expenses.find(
        {"user_id": current_user["user_id"], "date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate totals
    total_regular_earnings = sum(e.get("regular_earnings", 0) for e in work_entries)
    total_extra_earnings = sum(e.get("extra_earnings", 0) for e in work_entries)
    total_earnings = total_regular_earnings + total_extra_earnings
    
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    
    net_balance = total_earnings - total_expenses
    
    # Calculate savings rate
    savings_rate = 0
    if total_earnings > 0:
        savings_rate = ((total_earnings - total_expenses) / total_earnings) * 100
    
    # Get health message
    if savings_rate >= 20:
        health_message = f"¡Excelente! Has ahorrado el {savings_rate:.0f}% de tus ingresos"
    elif savings_rate >= 10:
        health_message = f"¡Bien! Has ahorrado el {savings_rate:.0f}% de tus ingresos"
    elif savings_rate >= 0:
        health_message = f"Mantén el control, has ahorrado el {savings_rate:.0f}%"
    else:
        health_message = f"¡Atención! Tus gastos superan tus ingresos en {abs(net_balance):.2f}€"
    
    return {
        "month": month,
        "total_regular_earnings": round(total_regular_earnings, 2),
        "total_extra_earnings": round(total_extra_earnings, 2),
        "total_earnings": round(total_earnings, 2),
        "total_expenses": round(total_expenses, 2),
        "net_balance": round(net_balance, 2),
        "savings_rate": round(savings_rate, 1),
        "health_message": health_message,
        "work_entries_count": len(work_entries),
        "expenses_count": len(expenses)
    }

@api_router.get("/dashboard/weekly-chart")
async def get_weekly_chart(
    current_user: dict = Depends(get_current_user),
    weeks: int = 4  # Number of weeks to include
):
    """Get weekly income vs expenses data for charts"""
    from datetime import date as date_type
    
    today = date_type.today()
    
    weekly_data = []
    
    for i in range(weeks):
        # Calculate week start (Monday) and end (Sunday)
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday + (i * 7))
        week_end = week_start + timedelta(days=6)
        
        week_start_str = week_start.strftime("%Y-%m-%d")
        week_end_str = week_end.strftime("%Y-%m-%d")
        
        # Get work entries for the week
        work_entries = await db.work_entries.find({
            "user_id": current_user["user_id"],
            "date": {"$gte": week_start_str, "$lte": week_end_str}
        }, {"_id": 0}).to_list(100)
        
        # Get expenses for the week
        expenses = await db.expenses.find({
            "user_id": current_user["user_id"],
            "date": {"$gte": week_start_str, "$lte": week_end_str}
        }, {"_id": 0}).to_list(100)
        
        total_income = sum(e.get("total_earnings", 0) for e in work_entries)
        total_expense = sum(e.get("amount", 0) for e in expenses)
        
        weekly_data.append({
            "week_start": week_start_str,
            "week_end": week_end_str,
            "week_label": f"Sem {weeks - i}",
            "income": round(total_income, 2),
            "expenses": round(total_expense, 2),
            "balance": round(total_income - total_expense, 2)
        })
    
    # Reverse to show oldest first
    weekly_data.reverse()
    
    return {"weeks": weekly_data}

@api_router.get("/dashboard/history")
async def get_unified_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get unified history of work entries and expenses"""
    # Get recent work entries
    work_entries = await db.work_entries.find(
        {"user_id": current_user["user_id"], "end_time": {"$ne": None}},
        {"_id": 0}
    ).sort("date", -1).to_list(limit)
    
    # Get recent expenses
    expenses = await db.expenses.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(limit)
    
    # Combine and format
    history = []
    
    for entry in work_entries:
        history.append({
            "type": "work",
            "id": entry["entry_id"],
            "date": entry["date"],
            "title": f"Jornada completada",
            "subtitle": f"{entry['start_time']} - {entry['end_time']}",
            "amount": entry.get("total_earnings", 0),
            "is_income": True,
            "created_at": entry.get("created_at", datetime.now(timezone.utc))
        })
    
    for expense in expenses:
        history.append({
            "type": "expense",
            "id": expense["expense_id"],
            "date": expense["date"],
            "title": expense["description"],
            "subtitle": expense["category"],
            "amount": expense.get("amount", 0),
            "is_income": False,
            "created_at": expense.get("created_at", datetime.now(timezone.utc))
        })
    
    # Sort by date descending
    history.sort(key=lambda x: x["date"], reverse=True)
    
    return {"history": history[:limit]}

# ===== PUSH NOTIFICATION ENDPOINTS =====

@api_router.post("/push-tokens/register")
async def register_push_token(token_data: PushTokenCreate, current_user: dict = Depends(get_current_user)):
    """Register a push notification token"""
    # Check if token already exists
    existing = await db.push_tokens.find_one({"push_token": token_data.push_token}, {"_id": 0})
    
    if existing:
        await db.push_tokens.update_one(
            {"push_token": token_data.push_token},
            {"$set": {
                "user_id": current_user["user_id"],
                "is_active": True,
                "platform": token_data.platform
            }}
        )
    else:
        push_token = PushToken(
            user_id=current_user["user_id"],
            push_token=token_data.push_token,
            platform=token_data.platform,
            device_id=token_data.device_id
        )
        await db.push_tokens.insert_one(push_token.model_dump())
    
    return {"message": "Token registered successfully"}

@api_router.delete("/push-tokens/unregister")
async def unregister_push_token(push_token: str, current_user: dict = Depends(get_current_user)):
    """Unregister a push notification token"""
    await db.push_tokens.update_one(
        {"push_token": push_token, "user_id": current_user["user_id"]},
        {"$set": {"is_active": False}}
    )
    return {"message": "Token unregistered"}

# ===== HEALTH CHECK =====

@api_router.get("/")
async def root():
    return {"message": "Personal Finance API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
