#!/bin/bash
# ===========================================
# Roboroça - Backup PostgreSQL
# ===========================================
# Usage: ./docker/backup.sh
# Cron (diario 3am): 0 3 * * * /path/to/roboroca/docker/backup.sh >> /var/log/roboroca-backup.log 2>&1
#
# Restaurar: gunzip < backup_file.sql.gz | docker exec -i roboroca-db psql -U $POSTGRES_USER -d $POSTGRES_DB

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load env vars
if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    source "${PROJECT_DIR}/.env"
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-roboroca}"
POSTGRES_DB="${POSTGRES_DB:-roboroca}"

# Create backup dir
mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/roboroca_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup..."

docker exec roboroca-db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# Cleanup old backups
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "roboroca_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Done."
