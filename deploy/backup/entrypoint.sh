#!/bin/sh
# Installs the backup schedule and runs cron in the foreground.
set -eu

SCHEDULE="${BACKUP_CRON:-0 6 * * *}"

# Cron jobs start with an empty environment: save the variables they need.
export -p | grep -E ' (DATABASE_URL|BACKUP_[A-Z_]*|RCLONE_[A-Z_]*|TZ)=' > /etc/backup.env

echo "$SCHEDULE . /etc/backup.env; /usr/local/bin/backup.sh auto > /proc/1/fd/1 2>&1" \
  > /etc/crontabs/root

echo "Copias programadas: '$SCHEDULE' (TZ=${TZ:-UTC}) en ${BACKUP_DIR:-/backups}," \
  "se conservan ${BACKUP_RETENTION_DAYS:-30} días"
exec crond -f -l 8
