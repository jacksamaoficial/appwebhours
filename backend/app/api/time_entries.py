from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.time_entry import TimeEntryCreate, TimeEntryResponse, TimeEntryUpdate
from app.services.time_entries import TimeEntryService

router = APIRouter(prefix="/time-entries", tags=["time-entries"])


@router.get("", response_model=list[TimeEntryResponse])
async def list_entries(
    entry_date: date | None = Query(default=None, alias="date"),
    job_id: uuid.UUID | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TimeEntryResponse]:
    service = TimeEntryService(db)
    entries = await service.list_entries(
        current_user.id,
        entry_date=entry_date,
        job_id=job_id,
        from_date=from_date,
        to_date=to_date,
    )
    return [TimeEntryResponse.model_validate(e) for e in entries]


@router.post("", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    data: TimeEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryResponse:
    service = TimeEntryService(db)
    try:
        entry = await service.create_entry(current_user.id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return TimeEntryResponse.model_validate(entry)


@router.get("/{entry_id}", response_model=TimeEntryResponse)
async def get_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryResponse:
    service = TimeEntryService(db)
    try:
        entry = await service.get_entry(current_user.id, entry_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return TimeEntryResponse.model_validate(entry)


@router.patch("/{entry_id}", response_model=TimeEntryResponse)
async def update_entry(
    entry_id: uuid.UUID,
    data: TimeEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryResponse:
    service = TimeEntryService(db)
    try:
        entry = await service.update_entry(current_user.id, entry_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return TimeEntryResponse.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = TimeEntryService(db)
    try:
        await service.delete_entry(current_user.id, entry_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
