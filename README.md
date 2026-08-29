# Konsepthane

Konsepthane is a Turkish, SEO-led visual discovery and planning platform for birthdays, engagements,
baby celebrations and other special occasions. This repository contains the Milestone 1 technical
foundation and a complete Category → Concept vertical slice.

## What is included

- Separate public Next.js and admin Next.js applications using the App Router and Server Components.
- A NestJS REST modular monolith with OpenAPI, validated DTOs, request IDs and health endpoints.
- PostgreSQL/Prisma schema, reviewed initial migration and repeatable niche seed.
- Email/password auth, hashed passwords, rotating refresh sessions and permission-based RBAC.
- Admin login plus category and concept create/read/update/delete workflows.
- Public category/concept pages, Turkish slugs, metadata, canonical URLs, structured breadcrumbs,
  robots and sitemap foundations.
- S3-compatible presigned upload abstraction (MinIO locally) and BullMQ worker foundations.
- PostgreSQL, Redis, Meilisearch, MinIO, Mailpit, worker, apps and Nginx in Docker Compose.
- Shared UI primitives, strict TypeScript, ESLint, Prettier, Vitest and Turborepo quality gates.

The architecture is a modular monolith. PostgreSQL is authoritative; search, cache and image
derivatives are replaceable read models. See [architecture](docs/ARCHITECTURE.md),
[domain model](docs/DOMAIN_MODEL.md), [SEO](docs/SEO.md), [security](docs/SECURITY.md),
[API](docs/API.md) and [roadmap](docs/ROADMAP.md).

## Repository structure

```text
apps/
  web/                 public discovery and SEO application
  admin/               dedicated back-office application
  api/                 NestJS modular monolith
  worker/              BullMQ media/search job consumers
packages/
  database/            Prisma schema, migration, client and seed
  ui/                  reusable accessible UI primitives
  validation/          shared validation and Turkish slug logic
  shared-types/        transport-facing TypeScript contracts
  seo/                 metadata and structured-data helpers
  config/              shared constants
infra/
  docker/              development and production Dockerfiles
  nginx/               reverse proxy configuration
docs/
  adr/                  architecture decision records
  *.md                  product and engineering documentation
compose.yaml            complete local topology
```

## Requirements

- Node.js 22.12 or newer
- pnpm 10
- Docker Desktop with Compose v2
- Git

## Fastest setup: Docker

```bash
git clone <repository-url>
cd ilham
cp .env.example .env
docker compose up --build
```

On first start, the `migrate` service generates Prisma Client, applies committed migrations and runs
the idempotent seed before API-dependent services start. Wait until `web`, `admin` and `api` report
healthy, then use the URLs below. Keep `.env` out of version control and replace every placeholder
secret before any shared or internet-accessible deployment.

Stop the stack without deleting data:

```bash
docker compose down
```

Persistent volumes hold PostgreSQL, Redis, Meilisearch and MinIO data. Application source and
dependencies come from the built image, which avoids cross-platform workspace-link problems. Re-run
`docker compose up --build` after source changes. To remove local data intentionally, use
`docker compose down --volumes`; this is destructive.

## Local development without app containers

Copy the environment file, install dependencies and start the infrastructure you need:

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis meilisearch minio minio-init mailpit
pnpm db:generate
pnpm db:migrate -- --name your_change
pnpm db:seed
pnpm dev
```

Turborepo starts all four applications. When the API is unavailable the public frontend renders honest empty states
(never fabricated content); running environments use the API records.

## Local URLs

The table lists the `.env.example` defaults. The local `.env` on this machine overrides the host
ports to avoid collisions (`WEB_PORT=3200`, `ADMIN_PORT=3201`, `NGINX_PORT=8180`), so the public site
is http://localhost:3200, admin is http://localhost:3201/admin/giris and Nginx is
http://localhost:8180. Keep `WEB_URL`/`ADMIN_URL` aligned with those ports: they drive canonical URLs,
the sitemap and API CORS.

| Service       | Direct URL                        | Through Nginx                         |
| ------------- | --------------------------------- | ------------------------------------- |
| Public web    | http://localhost:3000             | http://localhost:8080                 |
| Admin         | http://localhost:3001/admin       | http://localhost:8080/admin           |
| Admin login   | http://localhost:3001/admin/giris | http://localhost:8080/admin/giris     |
| API           | http://localhost:4000/v1          | http://localhost:8080/api/v1          |
| OpenAPI       | http://localhost:4000/docs        | http://localhost:8080/api/docs        |
| API liveness  | http://localhost:4000/health/live | http://localhost:8080/api/health/live |
| Worker health | http://localhost:4001             | —                                     |
| Meilisearch   | http://localhost:7700             | —                                     |
| MinIO API     | http://localhost:9000             | —                                     |
| MinIO console | http://localhost:9001             | —                                     |
| Mailpit UI    | http://localhost:8025             | —                                     |
| PostgreSQL    | `localhost:5432`                  | —                                     |
| Redis         | `localhost:6379`                  | —                                     |

## Local test credentials

- Admin email: `admin@ilham.local`
- Admin password: `Ilham-Local-2026!`
- MinIO user: `minioadmin`
- MinIO password: `change-me-minio-secret`

These values are local defaults only. Change them in `.env` before sharing the environment. Rerunning
the seed updates the local administrator password to the configured `ADMIN_PASSWORD`.

## Database workflow

Edit `packages/database/prisma/schema.prisma`, then create and review a migration:

```bash
pnpm db:migrate -- --name concise_change_name
pnpm db:generate
pnpm db:seed
```

Staging/production deploy committed migrations with `pnpm db:deploy`. Never use `db push` or manual
DDL in production. The initial migration is under `packages/database/prisma/migrations`.

## Quality commands

```bash
pnpm format          # write formatting
pnpm format:check    # verify formatting
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check           # all gates in release order
```

Tests intentionally target critical behavior rather than a coverage percentage. The current
foundation tests Turkish slug generation and policy-guard construction; Milestone 2 adds database
integration and browser E2E tests for login, publishing and moderation workflows.

## Environment strategy

`.env.example` documents development values. Development, test, staging and production use the same
variable names and separate secret stores. The API validates critical variables at startup. Important
groups are database, Redis, Meilisearch, S3-compatible storage, SMTP, JWT secrets, application URLs
and seed credentials. Do not expose `INTERNAL_API_URL`, database credentials or signing secrets as
`NEXT_PUBLIC_*` values.

## Production build and deployment

```bash
pnpm install --frozen-lockfile
pnpm check
docker build -f infra/docker/Dockerfile --build-arg APP=api -t ilham-api .
```

Build one image per app by changing `APP` to `web`, `admin`, `api` or `worker`. Run migrations as a
release job before shifting traffic. Production readiness additionally requires managed backups and
restore drills, TLS/CDN, private networks, a real S3 bucket, managed secrets, central telemetry,
image/dependency scanning and legal review of KVKK/GDPR retention.

## Common troubleshooting

- Port already in use: stop the conflicting local service or change the host-side Compose port.
- API is not ready: inspect `docker compose logs api migrate postgres`; readiness requires PostgreSQL.
- Admin redirects to login: access cookies are short-lived; sign in again. Refresh UI automation is a
  Milestone 2 hardening item, although the API rotation endpoint already exists.
- Empty public page: confirm records are `PUBLISHED`; draft and review content never appears publicly.
- MinIO upload fails: confirm `minio-init` created `S3_BUCKET` and S3 credentials match `.env`.
- Prisma client mismatch: run `pnpm db:generate` after dependency or schema changes.
- Windows Docker bind mounts are slow: keep the repository in a Docker-friendly filesystem or run app
  processes on the host and only infrastructure in Compose.

## Product surface (current)

The public site is an editorial-first inspiration platform: Concepts/Guides are the primary objects,
photo-backed Experiences ("Ben bunu yaptım") and contextual Questions live under each concept, and
saves/collections act as planning boards. Members can sign in (`/giris`, local sample accounts come from the
seed), save and like content, build boards at `/kaydedilenler`, ask/answer/follow questions, share
experiences (at least one photo plus a rights declaration, moderated before publication) and report
content. Admin manages concepts (editorial sections, palette, FAQ, gallery, featured flag),
experiences, questions, comments and the moderation queue. Commerce, affiliate, shoppable images and
the AI concept planner remain disabled feature flags.

## Known unfinished items

Member registration/e-mail verification, automatic refresh of expired admin sessions in the UI,
answer "helpful" votes as a real relation, image derivative processing, Meilisearch facets, user/role
admin screens, SEO landing registry, redirect automation and E2E tests. See
[docs/HANDOFF_AUDIT.md](docs/HANDOFF_AUDIT.md) for the full audit and
[ROADMAP.md](docs/ROADMAP.md) for sequence.

## Recommended next milestone

Open member registration with e-mail verification (Mailpit locally), add Playwright E2E coverage for
login → experience submission → admin approval → concept page visibility, then image derivatives and
search facets before programmatic SEO or commercial features.
