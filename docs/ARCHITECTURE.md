# Architecture

## System context

The platform is a pnpm/Turborepo monorepo. `web` and `admin` are independent Next.js App Router
applications. `api` is a NestJS modular monolith and the only owner of transactional business rules.
`worker` consumes BullMQ jobs. PostgreSQL is authoritative; Redis, Meilisearch and object storage are
supporting infrastructure whose data can be rebuilt or reconciled.

```text
Browser → Nginx ┬→ web (public SSR/ISR)
                ├→ admin (private back office)
                └→ api (REST/OpenAPI) → PostgreSQL
                                      ├→ Redis/BullMQ → worker
                                      ├→ Meilisearch
                                      └→ S3-compatible storage (MinIO locally)
```

## Backend boundaries

The initial executable modules are auth, users/authorization, categories/taxonomy, concepts, media
and health. Planned modules are events, collections, comments, search, SEO, vendors, leads,
affiliate, advertising, moderation, notifications and analytics. A module owns its tables and
application services. Cross-module writes happen through an explicit service; non-critical side
effects use versioned domain events and idempotent jobs.

Controllers validate transport DTOs and return response DTOs. Services enforce policy and
transactions. Prisma access is injected through one database service and must not be used from UI
code. Role checks are expressed as permissions (`category.write`, `concept.publish`) through a guard,
not scattered role-name conditionals.

## Rendering and cache strategy

Public content uses Server Components. Stable category/concept pages are eligible for incremental
revalidation; mutation endpoints will later trigger tag-based invalidation. Admin pages are dynamic
and never cached publicly. Draft content is available only through authenticated APIs. API cache keys
are derived read models and are invalidated after commits.

## Data and consistency

PostgreSQL transactions protect authoring state. Search and image derivative updates are eventually
consistent through BullMQ. Jobs carry entity IDs and versions, are idempotent, retry with bounded
backoff and move to a dead-letter queue after exhaustion. Object originals are immutable; derivatives
are replaceable.

## Deployment shape

Containers are stateless. Nginx terminates the local routing layer; production TLS and CDN may sit in
front. Each app has liveness/readiness checks. Staging mirrors production topology with separate
secrets and buckets. Horizontal API/web/worker replicas are safe because sessions and jobs are
externalized.

## Key decisions

- Modular monolith before microservices: see [ADR-001](adr/001-modular-monolith.md).
- Meilisearch for Turkish-friendly discovery: see [ADR-002](adr/002-meilisearch.md).
- BullMQ now, broker seam later: see [ADR-003](adr/003-bullmq.md).
- Short access token plus rotating server-held refresh cookie: see [SECURITY.md](SECURITY.md).

## Phase 2 editoryal içerik ve bağlamsal topluluk sınırları

`Concept` ve `Guide` editoryal omurgadır. `community` modülü bunların altında yorum, bağlamsal soru ve
fotoğraflı Experience koordinasyonunu sağlar. `Question`, `Answer`, `Comment` ve `Experience` ayrı Prisma
agregalarıdır; `Concept → Question`, `Concept → Experience` gerçek yabancı anahtarlarla korunur. Genel
akış geriye dönük keşif yüzeyi olarak kalır ancak ana sayfanın ürün hiyerarşisini belirlemez.

Yorum, tepki, kaydetme, takip, bildirim, raporlama ve moderasyon işlemleri kaynak içerik varlığını
doğrular. Meilisearch yalnızca keşif kopyasıdır; erişim ve indekslenebilirlik kararının kaynağı PostgreSQL'dir.
Worker `community` indeksini başlangıçta uzlaştırır ve BullMQ `search` işlerini idempotent olarak işler.

Deneyim görselleri oturum doğrulamalı imzalı yükleme ile S3/MinIO'ya gider. API en az bir görseli ve hak
beyanını doğrular; moderasyon onayı olmadan Experience genel listelerde görünmez. Onay sonrası deneyim
ilgili konsept, `/deneyimler`, profil ve Meilisearch okuma modellerine girer.
