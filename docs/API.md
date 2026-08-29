# REST API

Base path: `/v1`. Interactive OpenAPI is served at `/docs` when the API is running.

## Conventions

- JSON request/response bodies and UTF-8 Turkish content.
- Bearer access tokens for protected endpoints; refresh tokens are rotated through auth.
- Validation rejects unknown properties. Errors use NestJS' `{ statusCode, message, error }` shape.
- Collection endpoints return `{ data, meta: { page, pageSize, total, pageCount } }`.
- Public endpoints return published content only. Admin endpoints require explicit permissions.

## Milestone 1 endpoints

| Method | Path                       | Access            | Purpose                                   |
| ------ | -------------------------- | ----------------- | ----------------------------------------- |
| POST   | `/v1/auth/login`           | Public, throttled | Email/password login                      |
| POST   | `/v1/auth/refresh`         | Refresh token     | Rotate refresh session                    |
| GET    | `/v1/categories`           | Public            | Published categories                      |
| GET    | `/v1/categories/:slug`     | Public            | Published category and concepts           |
| GET    | `/v1/categories/admin/all` | `category.read`   | All category states                       |
| POST   | `/v1/categories`           | `category.write`  | Create category                           |
| PATCH  | `/v1/categories/:id`       | `category.write`  | Update category                           |
| DELETE | `/v1/categories/:id`       | `category.write`  | Delete empty category                     |
| GET    | `/v1/concepts`             | Public            | Published concepts                        |
| GET    | `/v1/concepts/:slug`       | Public            | Published concept detail                  |
| GET    | `/v1/concepts/admin/all`   | `concept.read`    | All concept states                        |
| POST   | `/v1/concepts`             | `concept.write`   | Create concept                            |
| PATCH  | `/v1/concepts/:id`         | `concept.write`   | Update concept                            |
| DELETE | `/v1/concepts/:id`         | `concept.write`   | Delete concept                            |
| POST   | `/v1/media/uploads`        | `media.manage`    | Create short-lived presigned image upload |
| GET    | `/health/live`             | Public            | Process liveness                          |
| GET    | `/health/ready`            | Public            | Database readiness                        |

Publishing permissions are present in RBAC but the first CRUD surface treats write as editorial
control. Milestone 2 will split submit/review/publish commands and require `*.publish` on state
transitions.

## Konsept keşfi

`GET /v1/concepts` şu sorgu parametrelerini kabul eder: `sort=popular|new|saved`, `category=<slug>`,
`q=<metin>`, `page`, `pageSize`. `popular` sıralaması öne çıkan → deneyim sayısı → kaydetme → soru →
yayın tarihi zincirini izler. Konsept oluşturma/güncelleme DTO'su editoryal alanları (`introduction`,
`colorPalette[]`, `decorationIdeas`, `tableSetup`, `balloonIdeas`, `cakeIdeas`, `venueSuggestions`,
`practicalTips`, `alternatives`, `faq[]`, `images[]`, `featured`, `indexability`) taşır; `images`
verildiğinde galeri satırları tamamen değiştirilir.

## Topluluk uçları

- `GET /v1/community/feed`, `/overview`, `/topics`, `/event-types`
- `GET /v1/community/questions?tab=popular|new|unanswered&concept=<slug>&q=`
- `GET /v1/community/questions/following/mine` (üye), `/questions/:slug`
- `GET /v1/community/experiences?eventType=<slug>&venue=<metin>&concept=<slug>&sort=popular|new&q=`
- `GET /v1/community/experiences/:slug`, `/discussions/:slug`, `/polls/:slug`, `/guides/:slug`
- `GET /v1/community/profiles/:username`, `/collections/public`, `/collections/public/:slug`
- `GET /v1/community/search/all?q=` — Meilisearch kimlikleri + PostgreSQL hidrasyonu; her zaman
  `{ concepts, experiences, questions, guides, topics }` şeklinde normalize döner
- Üye: `GET /me`, `GET /interactions/state?contentType&contentId`, `GET /saves/mine`,
  `GET /notifications`, `GET /collections/mine` (hidrasyonlu)
- Kimlik doğrulamalı oluşturma: `POST /questions`, `/experiences`, `/discussions`, `/polls`,
  `/comments`, `/concept-suggestions`
- Etkileşim: `POST /reactions/toggle`, `/saves/toggle`, `/follows/users/:id/toggle`,
  `/questions/:id/follow/toggle`
- Soru: `POST /questions/:id/answers`, `PATCH /questions/:id/answers/:answerId/accept`
- Koleksiyon: `POST /collections`, `PATCH /collections/:id` (başlık/açıklama/görünürlük),
  `POST /collections/:id/items`, `DELETE /collections/:id/items/:itemId`
- Güvenlik: `POST /reports`
- Yönetim (`moderation.manage`): `GET /admin/overview`, `GET|PATCH /admin/experiences/:id`,
  `POST /admin/experiences/:id/images/:imageId/remove`, `GET /admin/questions`,
  `PATCH /admin/questions/:id`, `GET /admin/comments`, `PATCH /admin/comments/:id`,
  `GET /admin/moderation`, `POST /admin/moderation/:id/actions`

Moderasyon eylemleri (`APPROVE`, `REJECT`, `HIDE`, `REMOVE`, `RESTORE`, `LOCK`) yalnızca vaka kaydını
değil ilgili içeriğin `visibility`/`moderationStatus` (deneyimlerde `status`) alanlarını da günceller.

Mutasyonlar JWT Bearer token ister. Yönetim uçları ek olarak `moderation.manage` yetkisini merkezi guard
üzerinden doğrular. Geçersiz içerik ilişkileri, üçüncü seviye yorum ve ikinci anket oyu servis katmanında
reddedilir.
