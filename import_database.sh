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

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <dump-file.sql>"
  exit 1
fi

INPUT_FILE="$1"
if [ ! -f "$INPUT_FILE" ]; then
  echo "ERROR: File not found: $INPUT_FILE"
  exit 1
fi

export PGCLIENTENCODING=UTF8

echo "Importing database from ${INPUT_FILE}"
$COMPOSE_CMD exec -T db psql -U postgres -d etech -v ON_ERROR_STOP=1 < "$INPUT_FILE"
echo "Import completed"
