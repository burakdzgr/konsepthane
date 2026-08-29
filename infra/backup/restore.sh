#!/usr/bin/env sh
# Restore a PostgreSQL dump produced by the `postgres-backup` service (compose.prod.yaml).
#   ./infra/backup/restore.sh backups/daily/konsepthane-20260901-000000.sql.gz
# Restores into the running `postgres` container using the credentials from .env.
set -eu
FILE="${1:?usage: restore.sh <dump.sql.gz>}"
set -a; . ./.env; set +a
echo "Restoring $FILE into database $POSTGRES_DB (all current data will be replaced)"
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}_restore\";"
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${POSTGRES_DB}_restore\";"
gunzip -c "$FILE" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "${POSTGRES_DB}_restore" -q
echo "Dump loaded into ${POSTGRES_DB}_restore. Verify, then swap:"
echo "  docker compose stop api worker web admin"
echo "  docker compose exec postgres psql -U $POSTGRES_USER -d postgres -c 'ALTER DATABASE \"$POSTGRES_DB\" RENAME TO \"${POSTGRES_DB}_old\"; ALTER DATABASE \"${POSTGRES_DB}_restore\" RENAME TO \"$POSTGRES_DB\";'"
echo "  docker compose start api worker web admin"
