"""Access-control tests: anonymous users, low roles and other businesses must be refused."""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

PASSWORD = "Password1"
DAY = "2026-07-01"


async def _register(client: AsyncClient, email: str) -> dict[str, str]:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "full_name": "O", "business_name": "Pub"},
    )
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _employee(client: AsyncClient, owner: dict[str, str], email: str, role: str):
    resp = await client.post(
        "/api/v1/employees",
        json={"email": email, "full_name": "E", "password": PASSWORD, "role": role},
        headers=owner,
    )
    assert resp.status_code == 201, resp.text
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return resp.json()["id"], {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.fixture
async def victim(client: AsyncClient) -> dict[str, str]:
    """A business with one of every resource, to be attacked by others."""
    tag = uuid.uuid4().hex[:8]
    owner = await _register(client, f"victim_owner_{tag}@example.com")
    job = (await client.post("/api/v1/jobs", json={"name": "Barra"}, headers=owner)).json()["id"]
    emp_id, _ = await _employee(client, owner, f"victim_emp_{tag}@example.com", "hours")
    entry = (
        await client.post(
            "/api/v1/time-entries",
            json={"job_id": job, "date": DAY, "start_time": "20:00", "end_time": "23:00"},
            headers=owner,
        )
    ).json()["id"]
    expense = (
        await client.post(
            "/api/v1/expenses",
            json={"date": DAY, "amount": 10, "description": "x", "job_id": job},
            headers=owner,
        )
    ).json()["id"]
    await client.put(
        f"/api/v1/business-days/{DAY}/sales", json={"cash": 100, "card": 0, "cash_out": 0}, headers=owner
    )
    return {"owner": owner, "job": job, "employee": emp_id, "entry": entry, "expense": expense}


# (method, path, json body) for every protected endpoint
def _endpoints(v: dict) -> list[tuple[str, str, dict | None]]:
    return [
        ("GET", "/api/v1/auth/me", None),
        ("GET", "/api/v1/business", None),
        ("PATCH", "/api/v1/business", {"name": "Hacked"}),
        ("GET", "/api/v1/jobs", None),
        ("POST", "/api/v1/jobs", {"name": "X"}),
        ("GET", f"/api/v1/jobs/{v['job']}", None),
        ("PATCH", f"/api/v1/jobs/{v['job']}", {"name": "Hacked"}),
        ("DELETE", f"/api/v1/jobs/{v['job']}", None),
        ("GET", "/api/v1/time-entries", None),
        ("GET", f"/api/v1/time-entries/{v['entry']}", None),
        ("PATCH", f"/api/v1/time-entries/{v['entry']}", {"notes": "hacked"}),
        ("DELETE", f"/api/v1/time-entries/{v['entry']}", None),
        ("GET", "/api/v1/expenses", None),
        ("GET", f"/api/v1/expenses/{v['expense']}", None),
        ("PATCH", f"/api/v1/expenses/{v['expense']}", {"amount": 1}),
        ("DELETE", f"/api/v1/expenses/{v['expense']}", None),
        ("GET", "/api/v1/business-days", None),
        ("GET", "/api/v1/business-days/closed", None),
        ("GET", f"/api/v1/business-days/{DAY}", None),
        ("PUT", f"/api/v1/business-days/{DAY}/sales", {"cash": 0, "card": 0, "cash_out": 0}),
        ("POST", f"/api/v1/business-days/{DAY}/close", None),
        ("POST", f"/api/v1/business-days/{DAY}/reopen", None),
        ("GET", "/api/v1/employees", None),
        ("POST", "/api/v1/employees", {"email": "n@example.com", "full_name": "N", "password": PASSWORD}),
        ("PATCH", f"/api/v1/employees/{v['employee']}", {"role": "hours_expenses_sales"}),
        ("GET", f"/api/v1/employees/{v['employee']}/pay-schedule", None),
        ("PUT", f"/api/v1/employees/{v['employee']}/pay-schedule", {"bands": [], "overtime_rate": 99}),
        ("GET", "/api/v1/payroll?from_date=2026-07-01&to_date=2026-07-31", None),
        ("GET", "/api/v1/admin/backups", None),
        ("POST", "/api/v1/admin/backups", None),
    ]


@pytest.mark.asyncio
async def test_anonymous_and_forged_tokens_are_rejected(client: AsyncClient, victim) -> None:
    forged = {"Authorization": "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4IiwidHlwZSI6ImFjY2VzcyJ9."}
    for headers in ({}, forged, {"Authorization": "Bearer garbage"}):
        for method, path, body in _endpoints(victim):
            resp = await client.request(method, path, json=body, headers=headers)
            assert resp.status_code == 401, (method, path, headers, resp.status_code)


@pytest.mark.asyncio
async def test_refresh_token_cannot_be_used_as_access_token(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh_abuse@example.com", "password": PASSWORD, "full_name": "R",
              "business_name": "Pub"},
    )
    refresh = resp.cookies.get("refresh_token")
    assert refresh
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh}"})
    assert me.status_code == 401


@pytest.mark.asyncio
async def test_other_business_cannot_touch_victim_data(client: AsyncClient, victim) -> None:
    attacker = await _register(client, "attacker_owner@example.com")
    for method, path, body in _endpoints(victim):
        resp = await client.request(method, path, json=body, headers=attacker)
        if resp.status_code < 300:
            # Allowed only when it acts on the attacker's own business, never the victim's.
            data = resp.json() if resp.content else None
            text = str(data)
            assert victim["job"] not in text and victim["entry"] not in text, (method, path)
            assert victim["expense"] not in text and victim["employee"] not in text, (method, path)
        else:
            assert resp.status_code in (400, 403, 404), (method, path, resp.status_code)

    # The victim's data is intact.
    owner = victim["owner"]
    assert (await client.get(f"/api/v1/jobs/{victim['job']}", headers=owner)).json()["name"] == "Barra"
    entry = (await client.get(f"/api/v1/time-entries/{victim['entry']}", headers=owner)).json()
    assert entry["notes"] is None
    assert (await client.get(f"/api/v1/expenses/{victim['expense']}", headers=owner)).json()["amount"] == 10
    business = (await client.get("/api/v1/business", headers=owner)).json()
    assert business["name"] == "Pub"
    day = (await client.get(f"/api/v1/business-days/{DAY}", headers=owner)).json()
    assert day["cash"] == 100 and day["is_closed"] is False


@pytest.mark.asyncio
async def test_foreign_ids_in_request_bodies_are_rejected(client: AsyncClient, victim) -> None:
    attacker = await _register(client, "attacker2_owner@example.com")
    my_job = (await client.post("/api/v1/jobs", json={"name": "Mio"}, headers=attacker)).json()["id"]

    # Using the victim's job or employee from another business
    cases = [
        ("/api/v1/time-entries", {"job_id": victim["job"], "date": DAY, "start_time": "20:00"}),
        ("/api/v1/time-entries",
         {"user_id": victim["employee"], "job_id": my_job, "date": DAY, "start_time": "20:00"}),
        ("/api/v1/expenses", {"date": DAY, "amount": 1, "description": "x", "job_id": victim["job"]}),
    ]
    for path, body in cases:
        resp = await client.post(path, json=body, headers=attacker)
        assert resp.status_code in (400, 404), (path, body, resp.status_code)


@pytest.mark.asyncio
async def test_role_matrix(client: AsyncClient, victim) -> None:
    owner = victim["owner"]
    _, hours = await _employee(client, owner, "m_hours@example.com", "hours")
    _, expenses = await _employee(client, owner, "m_exp@example.com", "hours_expenses")
    _, sales = await _employee(client, owner, "m_sales@example.com", "hours_expenses_sales")

    owner_only = [
        ("PATCH", "/api/v1/business", {"name": "X"}),
        ("POST", "/api/v1/jobs", {"name": "X"}),
        ("PATCH", f"/api/v1/jobs/{victim['job']}", {"name": "X"}),
        ("DELETE", f"/api/v1/jobs/{victim['job']}", None),
        ("GET", "/api/v1/employees", None),
        ("POST", "/api/v1/employees", {"email": "z@example.com", "full_name": "Z", "password": PASSWORD}),
        ("PATCH", f"/api/v1/employees/{victim['employee']}", {"role": "hours_expenses_sales"}),
        ("GET", f"/api/v1/employees/{victim['employee']}/pay-schedule", None),
        ("PUT", f"/api/v1/employees/{victim['employee']}/pay-schedule", {"bands": []}),
        ("GET", "/api/v1/payroll?from_date=2026-07-01&to_date=2026-07-31", None),
        ("POST", f"/api/v1/business-days/{DAY}/close", None),
        ("POST", f"/api/v1/business-days/{DAY}/reopen", None),
    ]
    sales_and_up = [
        ("GET", "/api/v1/business-days", None),
        ("PUT", f"/api/v1/business-days/{DAY}/sales", {"cash": 1, "card": 1, "cash_out": 0}),
    ]
    expenses_and_up = [
        ("GET", "/api/v1/expenses", None),
        ("POST", "/api/v1/expenses", {"date": DAY, "amount": 1, "description": "x"}),
        ("DELETE", f"/api/v1/expenses/{victim['expense']}", None),
    ]
    admin_only = [("GET", "/api/v1/admin/backups", None), ("POST", "/api/v1/admin/backups", None)]

    denied = {
        "hours": owner_only + sales_and_up + expenses_and_up + admin_only,
        "expenses": owner_only + sales_and_up + admin_only,
        "sales": owner_only + admin_only,
    }
    for name, headers in (("hours", hours), ("expenses", expenses), ("sales", sales)):
        for method, path, body in denied[name]:
            resp = await client.request(method, path, json=body, headers=headers)
            assert resp.status_code == 403, (name, method, path, resp.status_code)

    # An employee cannot see or edit other employees' hours.
    assert (await client.get(f"/api/v1/time-entries/{victim['entry']}", headers=sales)).status_code == 404
    resp = await client.patch(
        f"/api/v1/time-entries/{victim['entry']}", json={"notes": "x"}, headers=sales
    )
    assert resp.status_code == 400 or resp.status_code == 404
    assert (await client.get("/api/v1/time-entries", headers=hours)).json() == []


@pytest.mark.asyncio
async def test_owner_cannot_be_demoted_or_disabled(client: AsyncClient) -> None:
    owner = await _register(client, "self_owner@example.com")
    me = (await client.get("/api/v1/auth/me", headers=owner)).json()
    for body in ({"role": "hours"}, {"is_active": False}):
        resp = await client.patch(f"/api/v1/employees/{me['id']}", json=body, headers=owner)
        assert resp.status_code == 400, body


@pytest.mark.asyncio
async def test_login_brute_force_is_rate_limited(client: AsyncClient) -> None:
    from app.core.rate_limit import limiter

    await _register(client, "bruteforce@example.com")
    limiter.reset()
    limiter.enabled = True
    try:
        codes = [
            (await client.post(
                "/api/v1/auth/login",
                json={"email": "bruteforce@example.com", "password": f"Wrong{i}x"},
            )).status_code
            for i in range(12)
        ]
    finally:
        limiter.enabled = False
        limiter.reset()
    assert codes[:10] == [401] * 10
    assert codes[10:] == [429, 429]


@pytest.mark.asyncio
async def test_registration_can_be_closed(client: AsyncClient, monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "ALLOW_REGISTRATION", False)
    assert (await client.get("/api/v1/auth/config")).json() == {"registration_open": False}
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "intruder@example.com", "password": PASSWORD, "full_name": "I",
              "business_name": "Fake"},
    )
    assert resp.status_code == 403
    # Not created: the email cannot log in.
    login = await client.post("/api/v1/auth/login", json={"email": "intruder@example.com", "password": PASSWORD})
    assert login.status_code == 401


@pytest.mark.asyncio
async def test_password_reset_revokes_existing_sessions(client: AsyncClient) -> None:
    owner = await _register(client, f"reset_owner_{uuid.uuid4().hex[:6]}@example.com")
    email = f"reset_emp_{uuid.uuid4().hex[:6]}@example.com"
    emp_id, emp = await _employee(client, owner, email, "hours")
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    stolen_refresh = login.cookies.get("refresh_token")
    assert (await client.get("/api/v1/auth/me", headers=emp)).status_code == 200

    resp = await client.patch(f"/api/v1/employees/{emp_id}", json={"password": "NewPass123"}, headers=owner)
    assert resp.status_code == 200

    assert (await client.get("/api/v1/auth/me", headers=emp)).status_code == 401
    client.cookies.set("refresh_token", stolen_refresh)
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401
    client.cookies.clear()
    # The new password works.
    new = await client.post("/api/v1/auth/login", json={"email": email, "password": "NewPass123"})
    assert new.status_code == 200


def test_placeholder_secret_key_is_rejected() -> None:
    from pydantic import ValidationError

    from app.core.config import Settings

    with pytest.raises(ValidationError):
        Settings(DATABASE_URL="postgresql://x", SECRET_KEY="changeme-use-openssl-rand-hex-32-in-production")
