#!/usr/bin/env bash
set -euo pipefail
DIR="${BACKUP_DIR:-./backups}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
mkdir -p "$DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$DIR/db_${STAMP}.sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$FILE"
find "$DIR" -name 'db_*.sql.gz' -mtime +"$KEEP" -delete
echo "Backup: $FILE"
