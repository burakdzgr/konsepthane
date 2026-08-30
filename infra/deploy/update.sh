#!/usr/bin/env bash
# Deploy a new version: git pull → rebuild → rolling up (migrations run in the migrate service).
set -euo pipefail
cd "$(dirname "$0")/../.."
COMPOSE="docker compose -f compose.yaml -f compose.prod.yaml"
git pull --ff-only
for svc in api web admin worker; do $COMPOSE build "$svc"; done
$COMPOSE up -d --remove-orphans
# Recreated app containers get new IPs; make sure the router picks them up.
$COMPOSE restart nginx >/dev/null
docker image prune -f >/dev/null
$COMPOSE ps --format 'table {{.Name}}\t{{.Status}}'
