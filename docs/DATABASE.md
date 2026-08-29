# Database operations

PostgreSQL 17 is the transactional source of truth. Prisma migrations under
`packages/database/prisma/migrations` are immutable after deployment. Developers create a named
migration locally, review SQL and deploy the same artifact in later environments. Manual production
schema edits are prohibited.

UUID primary keys avoid coordination. Unique slugs, emails and permission keys are indexed. Foreign
keys define business integrity; query-path indexes cover publication/category listings and session
lookups. `createdAt` and `updatedAt` use UTC. Soft deletion is limited to user-facing records where
restore, moderation or redirect semantics require it.

Backups, point-in-time recovery, restore drills, connection pooling and slow-query monitoring are
production launch requirements. Search, Redis and thumbnails are rebuildable and are not backups.
