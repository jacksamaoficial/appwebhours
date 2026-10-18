# Scheduled database backups (cron) for appwebhours.
# Same major version as the db service so pg_dump/pg_restore match the server.
FROM postgres:16-alpine

# tzdata: run the schedule in local time (TZ=Europe/Madrid)
# rclone: optional off-site copy (BACKUP_RCLONE_REMOTE)
RUN apk add --no-cache tzdata rclone

COPY backup.sh restore.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
