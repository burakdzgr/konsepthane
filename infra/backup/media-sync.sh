#!/usr/bin/env sh
# Mirror the media bucket to a second bucket/provider (off-site copy). Requires `rclone`.
#   rclone config  →  create remotes "media" (primary S3) and "media-backup" (secondary)
#   ./infra/backup/media-sync.sh
# Run daily from cron: 0 3 * * * /srv/konsepthane/infra/backup/media-sync.sh >> /var/log/media-sync.log 2>&1
set -eu
set -a; . ./.env; set +a
rclone sync "media:${S3_BUCKET}" "media-backup:${S3_BUCKET}-backup" --fast-list --transfers 8 --checksum
echo "$(date -u +%FT%TZ) media sync complete"
