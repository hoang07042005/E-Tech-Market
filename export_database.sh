#!/bin/bash
set -euo pipefail

COMPOSE_CMD=""
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif command -v docker >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "ERROR: docker-compose or docker compose is required"
  exit 1
fi

OUTPUT_FILE=${1:-"backup-$(date '+%Y%m%d%H%M%S').sql"}

export PGCLIENTENCODING=UTF8

echo "Exporting database to ${OUTPUT_FILE}"
$COMPOSE_CMD exec -T db pg_dump -U postgres -d etech --encoding=UTF8 --no-owner --no-acl > "${OUTPUT_FILE}"
echo "Export completed: ${OUTPUT_FILE}"
