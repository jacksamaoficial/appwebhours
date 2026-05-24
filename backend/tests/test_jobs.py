from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient, email: str) -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password1", "full_name": "Test"},
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Password1"}
    )
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_list_jobs(client: AsyncClient) -> None:
    token = await _get_token(client, "jobs@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post(
        "/api/v1/jobs",
        json={"name": "Acme Corp", "hourly_rate": 50.0, "currency": "EUR", "color": "#ff0000"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    job_id = create_resp.json()["id"]

    list_resp = await client.get("/api/v1/jobs", headers=headers)
    assert list_resp.status_code == 200
    ids = [j["id"] for j in list_resp.json()]
    assert job_id in ids


@pytest.mark.asyncio
async def test_archive_job(client: AsyncClient) -> None:
    token = await _get_token(client, "archive_job@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post(
        "/api/v1/jobs", json={"name": "To Archive"}, headers=headers
    )
    job_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/jobs/{job_id}", headers=headers)
    assert del_resp.status_code == 204

    list_resp = await client.get("/api/v1/jobs", headers=headers)
    ids = [j["id"] for j in list_resp.json()]
    assert job_id not in ids
