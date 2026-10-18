from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings

PASSWORD = "Password1"


@pytest.fixture
def backup_env(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BACKUP_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "Admin@Example.com")
    return tmp_path


async def _login(client: AsyncClient, email: str) -> dict[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "full_name": "X", "business_name": "Pub"},
    )
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_only_admin_emails_reach_backups(client: AsyncClient, backup_env) -> None:
    owner = await _login(client, "other_owner@example.com")
    assert (await client.get("/api/v1/admin/backups", headers=owner)).status_code == 403
    assert (await client.get("/api/v1/auth/me", headers=owner)).json()["is_admin"] is False

    admin = await _login(client, "admin@example.com")  # case-insensitive match
    assert (await client.get("/api/v1/auth/me", headers=admin)).json()["is_admin"] is True
    resp = await client.get("/api/v1/admin/backups", headers=admin)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_upload_list_download_delete(client: AsyncClient, backup_env) -> None:
    admin = await _login(client, "admin@example.com")

    bad = await client.post(
        "/api/v1/admin/backups/upload", files={"file": ("x.dump", b"not a dump")}, headers=admin
    )
    assert bad.status_code == 400

    content = b"PGDMP" + b"\x00" * 100
    up = await client.post(
        "/api/v1/admin/backups/upload", files={"file": ("x.dump", content)}, headers=admin
    )
    assert up.status_code == 201
    name = up.json()["name"]
    assert up.json()["kind"] == "upload"

    listed = await client.get("/api/v1/admin/backups", headers=admin)
    assert [b["name"] for b in listed.json()] == [name]

    dl = await client.get(f"/api/v1/admin/backups/{name}/download", headers=admin)
    assert dl.status_code == 200
    assert dl.content == content

    assert (await client.delete(f"/api/v1/admin/backups/{name}", headers=admin)).status_code == 204
    assert list(backup_env.iterdir()) == []


@pytest.mark.asyncio
async def test_rejects_bad_names_and_missing_confirmation(client: AsyncClient, backup_env) -> None:
    admin = await _login(client, "admin@example.com")
    (backup_env / "secret.txt").write_text("x")
    resp = await client.get("/api/v1/admin/backups/secret.txt/download", headers=admin)
    assert resp.status_code == 400
    resp = await client.get("/api/v1/admin/backups/..%2Fsecret.txt/download", headers=admin)
    assert resp.status_code in (400, 404)

    name = "appwebhours-20261018-060000-auto.dump"
    (backup_env / name).write_bytes(b"PGDMP")
    resp = await client.post(
        f"/api/v1/admin/backups/{name}/restore", json={"confirm": "si"}, headers=admin
    )
    assert resp.status_code == 400
