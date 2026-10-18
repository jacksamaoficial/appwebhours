from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.database import engine, get_db
from app.models.user import User
from app.services.backups import BackupError, BackupFile, BackupService

router = APIRouter(prefix="/admin", tags=["admin"])

# Large enough for years of a single bar's data; keeps uploads bounded.
_MAX_UPLOAD_BYTES = 200 * 1024 * 1024
RESTORE_CONFIRMATION = "RESTAURAR"


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    return current_user


class BackupResponse(BaseModel):
    name: str
    kind: str
    created_at: datetime
    size_bytes: int

    @classmethod
    def of(cls, backup: BackupFile) -> BackupResponse:
        return cls(**backup.__dict__)


class RestoreRequest(BaseModel):
    confirm: str


class RestoreResponse(BaseModel):
    restored: str
    safety_backup: BackupResponse


def _http_error(exc: BackupError) -> HTTPException:
    code = status.HTTP_404_NOT_FOUND if "not found" in str(exc) else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail=str(exc))


@router.get("/backups", response_model=list[BackupResponse])
async def list_backups(_admin: User = Depends(require_admin)) -> list[BackupResponse]:
    return [BackupResponse.of(b) for b in BackupService().list_backups()]


@router.post("/backups", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
async def create_backup(_admin: User = Depends(require_admin)) -> BackupResponse:
    try:
        return BackupResponse.of(await BackupService().create("manual"))
    except BackupError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.post("/backups/upload", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
async def upload_backup(file: UploadFile, _admin: User = Depends(require_admin)) -> BackupResponse:
    data = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large"
        )
    try:
        return BackupResponse.of(BackupService().save_upload(data))
    except BackupError as exc:
        raise _http_error(exc) from exc


@router.get("/backups/{name}/download")
async def download_backup(name: str, _admin: User = Depends(require_admin)) -> FileResponse:
    try:
        path = BackupService().get_path(name)
    except BackupError as exc:
        raise _http_error(exc) from exc
    return FileResponse(path, media_type="application/octet-stream", filename=name)


@router.delete("/backups/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup(name: str, _admin: User = Depends(require_admin)) -> None:
    try:
        BackupService().delete(name)
    except BackupError as exc:
        raise _http_error(exc) from exc


@router.post("/backups/{name}/restore", response_model=RestoreResponse)
async def restore_backup(
    name: str,
    data: RestoreRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> RestoreResponse:
    if data.confirm != RESTORE_CONFIRMATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type {RESTORE_CONFIRMATION} to confirm",
        )
    # Release this request's locks (the auth lookup) so pg_restore can drop tables,
    # and drop pooled connections that would otherwise keep pre-restore state.
    await db.commit()
    await engine.dispose()
    service = BackupService()
    try:
        safety = await service.restore(name)
    except BackupError as exc:
        raise _http_error(exc) from exc
    return RestoreResponse(restored=name, safety_backup=BackupResponse.of(safety))
