"""Server-side admin commands (run inside the backend container).

    docker compose -f docker-compose.prod.yml exec backend \
        python -m app.cli create-owner --email E --name N --business B

The password is read from $OWNER_PASSWORD or asked interactively, so it never
ends up in the shell history.
"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import os

from pydantic import ValidationError

from app.core.database import AsyncSessionLocal, engine
from app.schemas.auth import RegisterRequest
from app.services.auth import AuthService


async def create_owner(email: str, name: str, business: str, password: str) -> None:
    data = RegisterRequest(email=email, password=password, full_name=name, business_name=business)
    async with AsyncSessionLocal() as db:
        user, _access, _refresh = await AuthService(db).register(data)
        await db.commit()
    await engine.dispose()
    print(f"Cuenta de dueño creada: {user.email} (negocio «{business}»)")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    owner = sub.add_parser("create-owner", help="Create a business and its owner account")
    owner.add_argument("--email", required=True)
    owner.add_argument("--name", required=True)
    owner.add_argument("--business", required=True)
    args = parser.parse_args()

    password = os.environ.get("OWNER_PASSWORD") or getpass.getpass("Contraseña: ")
    try:
        asyncio.run(create_owner(args.email, args.name, args.business, password))
    except ValidationError as exc:
        raise SystemExit(f"Datos no válidos: {exc.errors()[0]['msg']}") from exc
    except ValueError as exc:  # e.g. email already registered
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
