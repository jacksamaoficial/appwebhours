from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate


class JobService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_jobs(self, user_id: uuid.UUID, active_only: bool = True) -> list[Job]:
        stmt = select(Job).where(Job.user_id == user_id)
        if active_only:
            stmt = stmt.where(Job.is_active.is_(True))
        stmt = stmt.order_by(Job.name)
        result = await self._db.scalars(stmt)
        return list(result.all())

    async def create_job(self, user_id: uuid.UUID, data: JobCreate) -> Job:
        job = Job(user_id=user_id, **data.model_dump())
        self._db.add(job)
        await self._db.flush()
        return job

    async def get_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> Job:
        job = await self._db.get(Job, job_id)
        if job is None or job.user_id != user_id:
            raise ValueError("Job not found")
        return job

    async def update_job(self, user_id: uuid.UUID, job_id: uuid.UUID, data: JobUpdate) -> Job:
        job = await self.get_job(user_id, job_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(job, field, value)
        await self._db.flush()
        return job

    async def archive_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> Job:
        job = await self.get_job(user_id, job_id)
        job.is_active = False
        await self._db.flush()
        return job
