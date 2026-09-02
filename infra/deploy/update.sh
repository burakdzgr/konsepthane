#!/usr/bin/env bash
# Zero-downtime deploy: git pull → build images → migrate → roll each app service
# (start the new container next to the old one, wait until it is healthy, then retire the old
# one) → graceful nginx reload. The router resolves service names per request, so it picks up the
# new container automatically; visitors never see a 502.
set -euo pipefail
cd "$(dirname "$0")/../.."
COMPOSE="docker compose -f compose.yaml -f compose.prod.yaml"
SERVICES=(api web admin worker)
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-180}

step() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }
fail() { printf '\033[1;31mHATA: %s\033[0m\n' "$*" >&2; exit 1; }

wait_healthy() { # $1 = container id
  local id=$1 status
  for _ in $(seq 1 $((HEALTH_TIMEOUT / 3))); do
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || echo missing)
    case "$status" in healthy | running) return 0 ;; exited | dead | missing) return 1 ;; esac
    sleep 3
  done
  return 1
}

roll() { # $1 = service
  local svc=$1 old new
  old=$($COMPOSE ps -q "$svc" | sort)
  if [ -z "$old" ]; then
    warn "$svc çalışmıyor; doğrudan başlatılıyor"
    $COMPOSE up -d --no-deps "$svc"
    return
  fi
  local count; count=$(echo "$old" | wc -l)
  # Start one extra container from the freshly built image; existing ones are left untouched.
  $COMPOSE up -d --no-deps --no-recreate --scale "$svc=$((count + 1))" "$svc" >/dev/null
  new=$(comm -13 <(echo "$old") <($COMPOSE ps -q "$svc" | sort))
  [ -n "$new" ] || { warn "$svc için yeni konteyner oluşmadı; klasik yeniden oluşturma"; $COMPOSE up -d --no-deps "$svc"; return; }
  if wait_healthy "$new"; then
    for id in $old; do docker stop -t 20 "$id" >/dev/null && docker rm "$id" >/dev/null; done
    # Reconcile compose's desired count back to 1 (the surviving container is the new one).
    $COMPOSE up -d --no-deps --no-recreate --scale "$svc=1" "$svc" >/dev/null
    echo "$svc: yeni sürüm devrede ($(docker inspect --format '{{.Name}}' "$new" | tr -d /))"
  else
    docker logs --tail 40 "$new" 2>&1 | tail -20
    docker rm -f "$new" >/dev/null
    fail "$svc yeni sürümü sağlıklı hale gelmedi; eski sürüm çalışmaya devam ediyor."
  fi
}

step "Kod"
git pull --ff-only

step "İmajlar derleniyor"
for svc in "${SERVICES[@]}"; do $COMPOSE build "$svc"; done

step "Veritabanı migrasyonları"
$COMPOSE run --rm migrate

step "Servisler kesintisiz yenileniyor"
for svc in "${SERVICES[@]}"; do roll "$svc"; done

step "Router"
# Config is bind-mounted: a graceful reload applies changes without dropping connections.
$COMPOSE exec -T nginx nginx -t -c /etc/nginx/konsepthane/nginx.prod.conf >/dev/null && $COMPOSE exec -T nginx nginx -s reload
# Any other service whose definition changed (nginx image, backup, …) — never touches the apps.
$COMPOSE up -d --remove-orphans --no-recreate >/dev/null

step "OAuth yönlendirme kontrolü"
ROUTER_PORT=$(grep -E '^NGINX_PORT=' .env | tail -1 | cut -d= -f2-)
ROUTER_PORT=${ROUTER_PORT:-8180}
OAUTH_PROBE=$(curl -sS -o /dev/null --max-redirs 0 \
  -w '%{http_code} %{redirect_url}' \
  -H 'Host: konsepthane.net' \
  -H 'X-Forwarded-Proto: https' \
  "http://127.0.0.1:${ROUTER_PORT}/api/auth/google?next=%2Ftr")
case "$OAUTH_PROBE" in
  "302 https://accounts.google.com/"*"redirect_uri=https%3A%2F%2Fkonsepthane.net%2Fapi%2Fauth%2Fgoogle%2Fcallback"*)
    echo "Google OAuth: yönlendirme hazır"
    ;;
  *) fail "Google OAuth başlangıcı Google'a yönlenmedi: $OAUTH_PROBE" ;;
esac

step "Temizlik"
docker image prune -f >/dev/null
$COMPOSE ps --format 'table {{.Name}}\t{{.Status}}'
