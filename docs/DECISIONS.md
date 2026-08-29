# Decision log

| Decision | Outcome                                                        | Status   |
| -------- | -------------------------------------------------------------- | -------- |
| ADR-001  | Modular monolith with explicit NestJS modules                  | Accepted |
| ADR-002  | Meilisearch as asynchronous discovery index                    | Accepted |
| ADR-003  | BullMQ/Redis for Milestone 1 jobs; broker port preserved       | Accepted |
| ADR-004  | Nginx as local reverse proxy                                   | Accepted |
| ADR-005  | Prisma 6 line initially for stable NestJS/CommonJS integration | Accepted |
| ADR-006  | İçerik niyetlerini ayrı agregalarda tutup akışta birleştirmek  | Accepted |
| ADR-007  | Yayın, görünürlük ve indekslenebilirliği ayrı yönetmek         | Accepted |
| ADR-008  | Çapraz etkileşimlerde tipli polimorfik bağlar kullanmak        | Accepted |

Prisma is deliberately pinned to the mature v6 line for the first milestone while Prisma 7's
mandatory adapter/ESM migration settles. Upgrading is isolated to `@ilham/database` and is a planned
dependency review, not an architectural rewrite.
