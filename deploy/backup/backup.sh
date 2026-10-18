#!/bin/sh
# Dumps the database to $BACKUP_DIR (pg_dump custom format).
# Usage: backup.sh [auto|manual|pre-restore]   (default: manual)
# Same file naming as the admin panel (app/services/backups.py).
set -eu

: "${DATABASE_URL:?DATABASE_URL is required (postgresql://user:pass@host:port/db)}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
KIND="${1:-manual}"

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/appwebhours-$(date +%Y%m%d-%H%M%S)-$KIND.dump"

trap 'rm -f "$file.tmp"' EXIT  # no half-written file if pg_dump fails
pg_dump --format=custom --no-owner --file "$file.tmp" "$DATABASE_URL"
mv "$file.tmp" "$file"
echo "$(date '+%Y-%m-%d %H:%M:%S') copia OK: $file ($(du -h "$file" | cut -f1))"

# Only automatic copies expire; manual and uploaded ones stay until deleted.
find "$BACKUP_DIR" -name 'appwebhours-*-auto.dump' -mtime +"$RETENTION_DAYS" -print -delete

# Optional off-site copy, e.g. BACKUP_RCLONE_REMOTE=gdrive:jacksocialclub-backups
if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  rclone copy "$file" "$BACKUP_RCLONE_REMOTE"
  echo "copia externa OK: $BACKUP_RCLONE_REMOTE"
fi
