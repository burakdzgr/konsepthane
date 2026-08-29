# Deployment

Local Compose runs the complete dependency topology. Staging and production use separately built,
immutable images, managed secrets and migrations as a release step before application rollout.
Applications expose liveness and readiness endpoints; traffic shifts only after readiness succeeds.

Production requires TLS, managed PostgreSQL backups/PITR, private Redis, S3 lifecycle rules, a CDN,
central logs/metrics/errors, image and dependency scanning, rate-limit tuning and secret rotation.
MinIO and Mailpit are local-development services, not production recommendations.

Rollback means rolling back application images. Destructive database changes use expand/migrate/
contract releases so an older application remains compatible during rollback.

## Launch reset

`CONFIRM_RESET=yes ADMIN_EMAIL=… ADMIN_USERNAME=… ADMIN_PASSWORD=… pnpm db:reset:launch` wipes every
member, content, media and audit row, keeps roles/permissions and the taxonomy (categories, event
types, themes, colours, topics, feature flags) and creates a single `super_admin`. Do **not** run
`pnpm db:seed` on a production database — it creates sample members and sample community content.
Clear the media bucket and the Meilisearch `community` index alongside it. Remaining go-live gaps
are tracked in [LAUNCH_READINESS.md](./LAUNCH_READINESS.md).
