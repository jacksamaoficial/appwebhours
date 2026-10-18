from __future__ import annotations

import asyncio
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.core.config import settings

# appwebhours-20261018-060000-auto.dump — same naming as deploy/backup/backup.sh
_NAME_RE = re.compile(r"^appwebhours-(\d{8}-\d{6})-(auto|manual|pre-restore|upload)\.dump$")
_PG_DUMP_MAGIC = b"PGDMP"  # header of pg_dump custom-format files
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class BackupError(Exception):
    """A backup operation failed (missing file, invalid name, pg_dump error…)."""


@dataclass(frozen=True)
class BackupFile:
    name: str
    kind: str
    created_at: datetime
    size_bytes: int


def _libpq_url() -> str:
    """DATABASE_URL without the SQLAlchemy driver, as pg_dump/pg_restore expect."""
    return re.sub(r"^postgresql\+\w+://", "postgresql://", settings.DATABASE_URL)


async def _run(*args: str, cwd: Path | None = None) -> None:
    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise BackupError(f"{Path(args[0]).name} failed: {stderr.decode(errors='replace')[-800:]}")


class BackupService:
    def __init__(self, backup_dir: str | None = None) -> None:
        self._dir = Path(backup_dir or settings.BACKUP_DIR)
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str) -> Path:
        # The regex also rules out path traversal ("../", "/").
        if not _NAME_RE.match(name):
            raise BackupError("Invalid backup name")
        path = self._dir / name
        if not path.is_file():
            raise BackupError("Backup not found")
        return path

    def _new_path(self, kind: str) -> Path:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        return self._dir / f"appwebhours-{stamp}-{kind}.dump"

    def list_backups(self) -> list[BackupFile]:
        backups = []
        for path in self._dir.iterdir():
            match = _NAME_RE.match(path.name)
            if match and path.is_file():
                backups.append(
                    BackupFile(
                        name=path.name,
                        kind=match.group(2),
                        created_at=datetime.strptime(match.group(1), "%Y%m%d-%H%M%S"),
                        size_bytes=path.stat().st_size,
                    )
                )
        return sorted(backups, key=lambda b: b.name, reverse=True)

    def get_path(self, name: str) -> Path:
        return self._path(name)

    async def create(self, kind: str = "manual") -> BackupFile:
        path = self._new_path(kind)
        tmp = path.with_suffix(".tmp")
        try:
            await _run("pg_dump", "--format=custom", "--no-owner", "--file", str(tmp), _libpq_url())
            tmp.rename(path)
        finally:
            tmp.unlink(missing_ok=True)
        return next(b for b in self.list_backups() if b.name == path.name)

    def save_upload(self, data: bytes) -> BackupFile:
        if not data.startswith(_PG_DUMP_MAGIC):
            raise BackupError("Not a pg_dump custom-format file")
        path = self._new_path("upload")
        path.write_bytes(data)
        return next(b for b in self.list_backups() if b.name == path.name)

    def delete(self, name: str) -> None:
        self._path(name).unlink()

    async def restore(self, name: str) -> BackupFile:
        """Replace the whole database with `name`. Returns the safety copy taken first.

        The schema is emptied first (tables added after the backup was taken would
        otherwise block dropping the ones it contains) and everything runs in a single
        transaction: if anything fails the database is left as it was. Afterwards
        migrations are applied, so restoring an older backup still matches the code.
        """
        source = self._path(name)
        safety = await self.create("pre-restore")
        sql = self._dir / f".{name}.restore.sql"
        try:
            await _run(
                "pg_restore", "--no-owner", "--no-privileges", "--file", str(sql), str(source)
            )
            await _run(
                "psql",
                "--no-psqlrc",
                "--quiet",
                "--single-transaction",
                "--set=ON_ERROR_STOP=1",
                "--command=DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
                f"--file={sql}",
                _libpq_url(),
            )
        finally:
            sql.unlink(missing_ok=True)
        await _run(sys.executable, "-m", "alembic", "upgrade", "head", cwd=_BACKEND_ROOT)
        return safety
