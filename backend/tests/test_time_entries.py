from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _setup(client: AsyncClient, email: str) -> tuple[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password1", "full_name": "T"},
    )
    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Password1"}
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    job = await client.post("/api/v1/jobs", json={"name": "My Job"}, headers=headers)
    return token, job.json()["id"]


@pytest.mark.asyncio
async def test_create_multiple_entries_same_day(client: AsyncClient) -> None:
    token, job_id = await _setup(client, "te1@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    for start, end in [("09:00:00", "12:00:00"), ("13:00:00", "17:00:00")]:
        resp = await client.post(
            "/api/v1/time-entries",
            json={
                "job_id": job_id,
                "date": "2026-05-25",
                "start_time": start,
                "end_time": end,
            },
            headers=headers,
        )
        assert resp.status_code == 201

    list_resp = await client.get(
        "/api/v1/time-entries", params={"date": "2026-05-25"}, headers=headers
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 2


@pytest.mark.asyncio
async def test_duration_calculated(client: AsyncClient) -> None:
    token, job_id = await _setup(client, "te2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/time-entries",
        json={
            "job_id": job_id,
            "date": "2026-05-25",
            "start_time": "09:00:00",
            "end_time": "11:30:00",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["duration_minutes"] == 150
