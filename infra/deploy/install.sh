#!/usr/bin/env bash
# First-time production install on the Plesk host (run as root from the repo root):
#   /opt/konsepthane/infra/deploy/install.sh
# Idempotent: re-running rebuilds/updates without touching data. Requires a filled .env.
set -euo pipefail
cd "$(dirname "$0")/../.."
COMPOSE="docker compose -f compose.yaml -f compose.prod.yaml"

step() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31mHATA: %s\033[0m\n' "$*" >&2; exit 1; }

step "Ön kontroller"
[ -f .env ] || fail ".env yok — .env.production dosyasını buraya .env olarak kopyalayın."
grep -vE "^[[:space:]]*#" .env | grep -qE "CHANGE_ME|<<" && fail ".env içinde doldurulmamış alan var: $(grep -vE "^[[:space:]]*#" .env | grep -nE 'CHANGE_ME|<<' | cut -d= -f1 | paste -sd' ')"
command -v docker >/dev/null || fail "docker kurulu değil"
docker compose version >/dev/null || fail "docker compose plugin yok"
FREE_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
[ "$FREE_GB" -ge 8 ] || fail "Diskte en az 8 GB boş alan gerekli (şu an ${FREE_GB} GB). docker builder prune / image prune ile yer açın."
for p in $(grep -E '^(NGINX|WEB|ADMIN|API|WORKER)_PORT=' .env | cut -d= -f2); do
  if ss -tulnH | grep -qE "127\.0\.0\.1:$p\b|0\.0\.0\.0:$p\b|\*:$p\b"; then
    if ! $COMPOSE ps --format '{{.Ports}}' 2>/dev/null | grep -q ":$p->"; then fail "Port $p host üzerinde başka bir süreç tarafından kullanılıyor."; fi
  fi
done
echo "ok: .env dolu, disk ${FREE_GB} GB, portlar uygun"

step "İmajlar derleniyor (sırayla; RAM'i korumak için tek tek)"
for svc in api web admin worker; do
  echo "-- build $svc"; $COMPOSE build "$svc"
done

step "Servisler başlatılıyor (migrate → api → web/admin/worker → nginx)"
$COMPOSE up -d --remove-orphans
# Recreated app containers get new IPs; make sure the router picks them up.
$COMPOSE restart nginx >/dev/null

step "Sağlık bekleniyor"
for i in $(seq 1 60); do
  st=$(docker inspect --format '{{.State.Health.Status}}' "$($COMPOSE ps -q api)" 2>/dev/null || echo starting)
  [ "$st" = healthy ] && break; sleep 5
done
[ "$st" = healthy ] || { $COMPOSE logs --tail 50 api; fail "api sağlıklı hale gelmedi"; }
echo "api: healthy"
curl -fsS -o /dev/null -H "Host: konsepthane.net" "http://127.0.0.1:$(grep -E '^NGINX_PORT=' .env | cut -d= -f2)/tr" && echo "web via nginx: 200"

step "İlk admin (yalnızca kullanıcı tablosu boşsa)"
USERS=$($COMPOSE exec -T postgres psql -U "$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2)" -d "$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2)" -tAc "SELECT count(*) FROM users" 2>/dev/null || echo 0)
if [ "${USERS:-0}" = "0" ]; then
  $COMPOSE run --rm -e CONFIRM_RESET=yes migrate pnpm --filter @ilham/database reset:launch
  echo "admin oluşturuldu: $(grep -E '^ADMIN_USERNAME=' .env | cut -d= -f2) / $(grep -E '^ADMIN_EMAIL=' .env | cut -d= -f2) (parola .env → ADMIN_PASSWORD)"
else
  echo "users tablosunda $USERS kayıt var; admin oluşturma atlandı"
fi

step "Bitti"
$COMPOSE ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
cat <<EOF

Sıradaki adım (Plesk): Websites & Domains → konsepthane.net → Apache & nginx Settings
  Proxy mode: kapalı · Smart static files: kapalı · Additional nginx directives: infra/plesk/nginx-directives.conf
Doğrulama: https://konsepthane.net/tr  ·  https://konsepthane.net/admin/giris  ·  https://konsepthane.net/api/v1/health/live
EOF
