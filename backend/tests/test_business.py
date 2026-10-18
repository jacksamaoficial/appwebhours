from __future__ import annotations

import pytest
from httpx import AsyncClient

PASSWORD = "Password1"


async def _owner(client: AsyncClient, email: str) -> dict[str, str]:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "full_name": "Owner", "business_name": "Pub"},
    )
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _employee(
    client: AsyncClient, owner: dict[str, str], email: str, role: str
) -> tuple[str, dict[str, str]]:
    resp = await client.post(
        "/api/v1/employees",
        json={"email": email, "full_name": "Emp", "password": PASSWORD, "role": role},
        headers=owner,
    )
    assert resp.status_code == 201, resp.text
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return resp.json()["id"], {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _job(client: AsyncClient, owner: dict[str, str]) -> str:
    resp = await client.post("/api/v1/jobs", json={"name": "Barra"}, headers=owner)
    return resp.json()["id"]


def _entry(job_id: str, day: str = "2026-06-01", start: str = "22:00:00", end: str = "23:00:00"):
    return {"job_id": job_id, "date": day, "start_time": start, "end_time": end}


@pytest.mark.asyncio
async def test_register_creates_owner(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_owner@example.com")
    me = await client.get("/api/v1/auth/me", headers=owner)
    assert me.json()["role"] == "owner"
    business = await client.get("/api/v1/business", headers=owner)
    assert business.json()["name"] == "Pub"


@pytest.mark.asyncio
async def test_overnight_shift_duration(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_night@example.com")
    job_id = await _job(client, owner)
    resp = await client.post(
        "/api/v1/time-entries", json=_entry(job_id, start="22:00:00", end="03:30:00"), headers=owner
    )
    assert resp.status_code == 201
    assert resp.json()["duration_minutes"] == 330


@pytest.mark.asyncio
async def test_employee_sees_only_own_hours_owner_sees_all(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_vis@example.com")
    job_id = await _job(client, owner)
    emp_id, emp = await _employee(client, owner, "biz_vis_emp@example.com", "hours")

    assert (await client.post("/api/v1/time-entries", json=_entry(job_id), headers=emp)).status_code == 201
    assert (await client.post("/api/v1/time-entries", json=_entry(job_id), headers=owner)).status_code == 201

    emp_list = await client.get("/api/v1/time-entries", headers=emp)
    assert [e["user_id"] for e in emp_list.json()] == [emp_id]

    owner_list = await client.get("/api/v1/time-entries", headers=owner)
    assert len(owner_list.json()) == 2
    filtered = await client.get("/api/v1/time-entries", params={"user_id": emp_id}, headers=owner)
    assert len(filtered.json()) == 1


@pytest.mark.asyncio
async def test_owner_records_hours_for_employee_but_employee_cannot(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_for@example.com")
    job_id = await _job(client, owner)
    emp_id, emp = await _employee(client, owner, "biz_for_emp@example.com", "hours")
    other_id, _ = await _employee(client, owner, "biz_for_emp2@example.com", "hours")

    resp = await client.post(
        "/api/v1/time-entries", json={**_entry(job_id), "user_id": emp_id}, headers=owner
    )
    assert resp.status_code == 201
    assert resp.json()["user_id"] == emp_id

    resp = await client.post(
        "/api/v1/time-entries", json={**_entry(job_id), "user_id": other_id}, headers=emp
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_role_permissions(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_roles@example.com")
    _, hours = await _employee(client, owner, "biz_roles_h@example.com", "hours")
    _, hours_exp = await _employee(client, owner, "biz_roles_he@example.com", "hours_expenses")
    _, full = await _employee(client, owner, "biz_roles_hes@example.com", "hours_expenses_sales")

    expense = {"date": "2026-06-01", "amount": 10, "description": "Hielo"}
    assert (await client.post("/api/v1/expenses", json=expense, headers=hours)).status_code == 403
    assert (await client.post("/api/v1/expenses", json=expense, headers=hours_exp)).status_code == 201
    # Expenses are business-wide: another employee with permission sees it.
    assert len((await client.get("/api/v1/expenses", headers=full)).json()) == 1

    sales = {"cash": 100, "card": 50, "cash_out": 20}
    url = "/api/v1/business-days/2026-06-01/sales"
    assert (await client.put(url, json=sales, headers=hours_exp)).status_code == 403
    resp = await client.put(url, json=sales, headers=full)
    assert resp.status_code == 200
    assert resp.json()["total"] == 130

    # Only the owner manages jobs, employees and closes days.
    assert (await client.post("/api/v1/jobs", json={"name": "X"}, headers=full)).status_code == 403
    assert (await client.get("/api/v1/employees", headers=full)).status_code == 403
    close = "/api/v1/business-days/2026-06-01/close"
    assert (await client.post(close, headers=full)).status_code == 403


@pytest.mark.asyncio
async def test_closed_day_blocks_everything(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_closed@example.com")
    job_id = await _job(client, owner)
    _, emp = await _employee(client, owner, "biz_closed_emp@example.com", "hours_expenses_sales")
    day = "2026-06-02"

    entry = await client.post("/api/v1/time-entries", json=_entry(job_id, day), headers=emp)
    entry_id = entry.json()["id"]

    resp = await client.post(f"/api/v1/business-days/{day}/close", headers=owner)
    assert resp.json()["is_closed"] is True

    closed = await client.get("/api/v1/business-days/closed", headers=emp)
    assert [d["date"] for d in closed.json()] == [day]

    assert (await client.post("/api/v1/time-entries", json=_entry(job_id, day), headers=emp)).status_code == 409
    assert (await client.patch(f"/api/v1/time-entries/{entry_id}", json={"notes": "x"}, headers=emp)).status_code == 409
    assert (await client.delete(f"/api/v1/time-entries/{entry_id}", headers=owner)).status_code == 409
    expense = {"date": day, "amount": 5, "description": "x"}
    assert (await client.post("/api/v1/expenses", json=expense, headers=emp)).status_code == 409
    sales = {"cash": 1, "card": 1, "cash_out": 0}
    assert (await client.put(f"/api/v1/business-days/{day}/sales", json=sales, headers=owner)).status_code == 409
    # Moving an entry from an open day into a closed one is also blocked.
    other = await client.post("/api/v1/time-entries", json=_entry(job_id, "2026-06-03"), headers=emp)
    resp = await client.patch(f"/api/v1/time-entries/{other.json()['id']}", json={"date": day}, headers=emp)
    assert resp.status_code == 409

    assert (await client.post(f"/api/v1/business-days/{day}/reopen", headers=owner)).status_code == 200
    assert (await client.delete(f"/api/v1/time-entries/{entry_id}", headers=owner)).status_code == 204


@pytest.mark.asyncio
async def test_deactivated_employee_loses_access(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_off@example.com")
    emp_id, emp = await _employee(client, owner, "biz_off_emp@example.com", "hours")
    resp = await client.patch(f"/api/v1/employees/{emp_id}", json={"is_active": False}, headers=owner)
    assert resp.status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=emp)).status_code == 401


@pytest.mark.asyncio
async def test_businesses_are_isolated(client: AsyncClient) -> None:
    owner_a = await _owner(client, "biz_a@example.com")
    owner_b = await _owner(client, "biz_b@example.com")
    job_a = await _job(client, owner_a)
    resp = await client.post("/api/v1/time-entries", json=_entry(job_a), headers=owner_b)
    assert resp.status_code == 400
    assert (await client.get("/api/v1/jobs", headers=owner_b)).json() == []


@pytest.mark.asyncio
async def test_cannot_assign_owner_role(client: AsyncClient) -> None:
    owner = await _owner(client, "biz_norole@example.com")
    resp = await client.post(
        "/api/v1/employees",
        json={"email": "x_owner@example.com", "full_name": "X", "password": PASSWORD, "role": "owner"},
        headers=owner,
    )
    assert resp.status_code == 422
