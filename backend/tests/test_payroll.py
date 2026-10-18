from __future__ import annotations

from datetime import time
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.services.payroll import Band, assert_no_overlap, split_shift

PASSWORD = "Password1"

JESSENIA = [Band(time(18), time(22), Decimal("8.50")), Band(time(22), time(2), Decimal("10"))]
MARIA = [Band(time(23), time(3), Decimal("10"))]


def test_split_jessenia_with_overtime() -> None:
    per_band, overtime = split_shift(time(18), time(3), JESSENIA)
    assert per_band == [240, 240]
    assert overtime == 60


def test_split_maria_overtime_before_and_after() -> None:
    # Starts an hour early and leaves 30 min late: 1h30 of overtime.
    per_band, overtime = split_shift(time(22), time(3, 30), MARIA)
    assert per_band == [240]
    assert overtime == 90


def test_split_shift_starting_after_midnight_uses_previous_day_band() -> None:
    per_band, overtime = split_shift(time(1), time(4), JESSENIA)
    assert per_band == [0, 60]
    assert overtime == 120


def test_no_bands_means_all_overtime() -> None:
    assert split_shift(time(20), time(23), []) == ([], 180)


def test_overlapping_bands_rejected() -> None:
    with pytest.raises(ValueError):
        assert_no_overlap([Band(time(18), time(23), Decimal(1)), Band(time(22), time(2), Decimal(1))])


async def _owner(client: AsyncClient, email: str) -> dict[str, str]:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "full_name": "Owner", "business_name": "Pub"},
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_payroll_report(client: AsyncClient) -> None:
    owner = await _owner(client, "pay_owner@example.com")
    job = (await client.post("/api/v1/jobs", json={"name": "Barra"}, headers=owner)).json()["id"]
    emp = (
        await client.post(
            "/api/v1/employees",
            json={"email": "jessenia@example.com", "full_name": "Jessenia Sierra", "password": PASSWORD},
            headers=owner,
        )
    ).json()["id"]

    schedule = {
        "bands": [
            {"start_time": "18:00", "end_time": "22:00", "hourly_rate": 8.5},
            {"start_time": "22:00", "end_time": "02:00", "hourly_rate": 10},
        ],
        "overtime_rate": 10,
    }
    resp = await client.put(f"/api/v1/employees/{emp}/pay-schedule", json=schedule, headers=owner)
    assert resp.status_code == 200
    assert len(resp.json()["bands"]) == 2

    for day in ("2026-06-05", "2026-06-06"):
        await client.post(
            "/api/v1/time-entries",
            json={"user_id": emp, "job_id": job, "date": day, "start_time": "18:00", "end_time": "03:00"},
            headers=owner,
        )

    report = await client.get(
        "/api/v1/payroll", params={"from_date": "2026-06-01", "to_date": "2026-06-30"}, headers=owner
    )
    assert report.status_code == 200
    [row] = report.json()  # the owner has no hours nor schedule: left out
    assert row["full_name"] == "Jessenia Sierra"
    assert row["regular_minutes"] == 2 * 480
    assert row["overtime_minutes"] == 2 * 60
    assert row["regular_pay"] == 2 * 74.0
    assert row["overtime_pay"] == 2 * 10.0
    assert row["total_pay"] == 168.0
    assert [b["minutes"] for b in row["bands"]] == [480, 480]


@pytest.mark.asyncio
async def test_overlapping_schedule_rejected_and_owner_only(client: AsyncClient) -> None:
    owner = await _owner(client, "pay_owner2@example.com")
    emp = (
        await client.post(
            "/api/v1/employees",
            json={"email": "maria@example.com", "full_name": "María", "password": PASSWORD,
                  "role": "hours_expenses_sales"},
            headers=owner,
        )
    ).json()["id"]
    bad = {"bands": [{"start_time": "23:00", "end_time": "03:00", "hourly_rate": 10},
                     {"start_time": "02:00", "end_time": "04:00", "hourly_rate": 10}]}
    resp = await client.put(f"/api/v1/employees/{emp}/pay-schedule", json=bad, headers=owner)
    assert resp.status_code == 400

    login = await client.post("/api/v1/auth/login", json={"email": "maria@example.com", "password": PASSWORD})
    emp_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = await client.get(
        "/api/v1/payroll", params={"from_date": "2026-06-01", "to_date": "2026-06-30"}, headers=emp_headers
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_employee_with_schedule_in_one_step(client: AsyncClient) -> None:
    owner = await _owner(client, "pay_owner3@example.com")
    new_employee = {
        "email": "nuevo@example.com",
        "full_name": "Empleado Nuevo",
        "password": PASSWORD,
        "pay_schedule": {
            "bands": [{"start_time": "20:00", "end_time": "01:00", "hourly_rate": 9.25}],
            "overtime_rate": 12,
        },
    }
    resp = await client.post("/api/v1/employees", json=new_employee, headers=owner)
    assert resp.status_code == 201
    schedule = await client.get(f"/api/v1/employees/{resp.json()['id']}/pay-schedule", headers=owner)
    assert schedule.json()["overtime_rate"] == 12
    assert [b["hourly_rate"] for b in schedule.json()["bands"]] == [9.25]

    # An invalid schedule is rejected and no account is created.
    bad = {
        **new_employee,
        "email": "malo@example.com",
        "pay_schedule": {
            "bands": [
                {"start_time": "20:00", "end_time": "01:00", "hourly_rate": 9},
                {"start_time": "00:00", "end_time": "02:00", "hourly_rate": 9},
            ]
        },
    }
    assert (await client.post("/api/v1/employees", json=bad, headers=owner)).status_code == 400
    emails = [e["email"] for e in (await client.get("/api/v1/employees", headers=owner)).json()]
    assert "malo@example.com" not in emails
