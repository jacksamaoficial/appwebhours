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
    job = await client.post("/api/v1/jobs", json={"name": "Job"}, headers=headers)
    return token, job.json()["id"]


@pytest.mark.asyncio
async def test_create_expense(client: AsyncClient) -> None:
    token, job_id = await _setup(client, "exp1@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/expenses",
        json={
            "job_id": job_id,
            "date": "2026-05-25",
            "amount": 49.99,
            "currency": "EUR",
            "category": "software",
            "description": "GitHub Copilot",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == 49.99
    assert data["category"] == "software"


@pytest.mark.asyncio
async def test_expense_without_job(client: AsyncClient) -> None:
    token, _ = await _setup(client, "exp2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/expenses",
        json={
            "date": "2026-05-25",
            "amount": 12.50,
            "currency": "EUR",
            "category": "food",
            "description": "Lunch",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["job_id"] is None
