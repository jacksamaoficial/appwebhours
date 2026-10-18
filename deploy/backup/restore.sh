#!/bin/sh
# Disaster recovery from the command line (works even if the app is down).
# Usage: docker compose exec backup restore.sh appwebhours-20261018-060000-auto.dump
#        (a file name inside $BACKUP_DIR, or an absolute path)
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
[ $# -eq 1 ] || { echo "Uso: restore.sh <archivo.dump>" >&2; exit 2; }
case "$1" in /*) file="$1" ;; *) file="$BACKUP_DIR/$1" ;; esac
[ -f "$file" ] || { echo "No existe: $file" >&2; exit 1; }

echo "Guardando el estado actual antes de restaurar…"
"$(dirname "$0")/backup.sh" pre-restore

sql="$(mktemp)"
trap 'rm -f "$sql"' EXIT
pg_restore --no-owner --no-privileges --file "$sql" "$file"
# One transaction: if anything fails, the database is left untouched.
PGOPTIONS='-c client_min_messages=warning' \
psql --no-psqlrc --quiet --output=/dev/null --single-transaction --set=ON_ERROR_STOP=1 \
  --command="DROP SCHEMA public CASCADE; CREATE SCHEMA public;" \
  --file="$sql" "$DATABASE_URL"

echo "Restaurado: $file"
echo "Reinicia la API para aplicar migraciones pendientes: docker compose restart backend"
