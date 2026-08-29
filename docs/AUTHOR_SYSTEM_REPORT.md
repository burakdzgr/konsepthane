# Kullanıcı / rol / profil / yazar sistemi — audit ve uygulama raporu

Tarih: 2026-08-29 · Kapsam: `apps/api`, `apps/web`, `apps/admin`, `packages/database`, `packages/seo`,
`packages/shared-types`, `packages/ui`, `scripts/seo-*`. Kalıcı kurallar: [AUTHORS.md](./AUTHORS.md).

## 1. Mevcut user/role/profile mimarisi

- **User** (`email`, `passwordHash`, `status` ACTIVE/PENDING_VERIFICATION/SUSPENDED/DELETED, `deletedAt`) ↔
  **Profile** (1:1; `displayName`, `username`, `bio`, `avatarUrl`, `websiteUrl`) ↔ **UserRole** ↔ **Role** ↔
  **RolePermission** ↔ **Permission**. Roller ve izinler veritabanı satırıdır; login sırasında kullanıcının
  tüm izinleri JWT `permissions[]` alanına yazılır (`auth.service.ts`).
- Sunucu tarafı zorlama: `JwtAuthGuard` (Bearer) + `PermissionGuard` / `@RequirePermissions()`.
- İçerik sahipliği: `Concept.authorId`, `Guide.authorId`, `Experience/Question/Answer/Discussion/Comment.authorId`
  → hepsi `User`. Editoryal içerik `ContentStatus` (DRAFT/IN_REVIEW/PUBLISHED/ARCHIVED), UGC
  `ModerationStatus` (PENDING/APPROVED/REJECTED) kullanıyordu — bu ayrım korunmuştur.
- Public profil: `/tr/uye/<username>` (noindex), `/v1/community/profiles/:username`.

## 2. Editor sistemi önceden var mıydı?

Kısmen. Seed'de `editor` rolü ve `concept.*`/`category.*` izinleri tanımlıydı, ancak:

- Hiçbir kullanıcıya `editor` rolü atanmıyordu; kullanıcı/rol yönetimi için API ucu ve admin sayfası yoktu.
- Editör profili kavramı yoktu (unvan, uzmanlık, uzun bio, sosyal linkler, aktiflik).
- Public editör sayfası, ProfilePage şeması ve sitemap girdisi yoktu; tüm profiller noindex idi.
- Admin panelinden oluşturulan konseptlerde `authorId = null`; seed içerikleri süper admin hesabına
  ("Konsepthane Yöneticisi") bağlıydı ve Article.author bu ad ile **Person** olarak çıkıyordu (gerçek bir
  editör değil).

## 3. Eksikler (audit bulguları)

| # | Bulgu | Etki |
| --- | --- | --- |
| 1 | Kullanıcı/rol yönetimi API'si ve admin ekranı yok | Admin editör oluşturamaz |
| 2 | 21 izinden yalnızca 5'i uçlarda kullanılıyor | Rol ayrımı fiilen yok |
| 3 | Public uçlar `author: { include: { profile: true } }` ile tam User satırı (email, passwordHash) döndürüyor | Veri sızıntısı |
| 4 | Konsept oluşturmada `authorId` set edilmiyor; `createdBy/updatedBy` yok | Sahiplik izlenemez |
| 5 | Article.author = süper admin Person | Sahte/temsili yazar |
| 6 | Profil sayfaları noindex; editör için ProfilePage/sitemap yok | E-E-A-T sinyali yok |
| 7 | `PermissionGuard` testi sadece constructor'ı test ediyor | Yetki regresyonu yakalanmaz |
| 8 | Rehber (Guide) için admin CRUD yok | Editör rehber yazamaz |
| 9 | Gizli/silinmiş profiller public'te 200 dönüyor | Gizlilik |

## 4. Yapılan değişiklikler (özet)

- RBAC kataloğu tek kaynakta (`packages/database/src/index.ts`, RBAC bölümü): `ROLE_KEYS`, `PERMISSION_KEYS`,
  `rolePermissions()`, `profileKindForRoles()`; seed, API ve testler bunu kullanır.
- `Profile.kind` (MEMBER/EDITOR) + editör alanları; `Concept/Guide.createdById/updatedById`.
- `UsersModule` (`/v1/users`, `/v1/editors`), `GuidesModule` (admin CRUD), editoryal yardımcılar
  (`assertCanPublish`, `resolveEditorialAuthor`), `publicAuthorSelect` ile 28 include noktası temizlendi.
- Web: `/tr/editor/[slug]` sayfası, `EditorialByline` / `AuthorBox` / `UgcAttribution` bileşenleri,
  yeni `articleJsonLd({ author })` sözleşmesi, `profilePageJsonLd`, `editorler` sitemap ailesi, `/uye/` →
  `/editor/` 301.
- Admin: Kullanıcılar, Editörler, Rehberler sayfaları; konsept/rehber formlarında yazar seçimi.
- Testler: 28 birim testi (rbac matrisi, guard allow/deny, editoryal kurallar) + canlı smoke akışı.
- `seo:schema` / `seo:audit`: author ve ProfilePage denetimleri.

## 5. Database değişiklikleri

Migration `packages/database/prisma/migrations/20260829120000_editorial_authors/migration.sql`
(uygulandı, `prisma migrate deploy`):

```sql
CREATE TYPE "ProfileKind" AS ENUM ('MEMBER', 'EDITOR');
ALTER TABLE "Profile"
  ADD COLUMN "kind" "ProfileKind" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN "jobTitle" TEXT, ADD COLUMN "longBio" TEXT,
  ADD COLUMN "expertise" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "socialLinks" JSONB,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "editorActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Profile_kind_editorActive_idx" ON "Profile"("kind", "editorActive");
ALTER TABLE "Concept" ADD COLUMN "createdById" TEXT, ADD COLUMN "updatedById" TEXT;  -- FK User, ON DELETE SET NULL
ALTER TABLE "Guide"   ADD COLUMN "createdById" TEXT, ADD COLUMN "updatedById" TEXT;  -- FK User, ON DELETE SET NULL
```

Karar: `authorId` (public byline) ile `createdById/updatedById` (hesap izi) ayrı tutuldu; UGC tablolarına
`createdBy` eklenmedi (UGC'de yazar = oluşturan). Ayrı bir `Editor` tablosu açılmadı — editör, `editor`
rolü + `Profile.kind` türetimi ile modellenir (mevcut yapı yeniden yazılmadı).

## 6. API değişiklikleri

| Uç | İzin | Not |
| --- | --- | --- |
| `GET /v1/users?page&pageSize&role&q&kind` | user.read | roller + içerik sayıları |
| `GET /v1/users/roles` | user.read | rol listesi + kullanıcı sayısı |
| `GET /v1/users/:id` | user.read | |
| `POST /v1/users` | user.write | user+profile atomik; `roles[]`; username otomatik slug; `kind` rolden türetilir |
| `PATCH /v1/users/:id` | user.write | profil alanları, `status`, `editorActive`, `isPublic` |
| `PUT /v1/users/:id/roles` | role.manage | rolleri değiştirir, `kind` günceller, refresh oturumlarını iptal eder; admin rolleri için system.manage |
| `DELETE /v1/users/:id` | user.write | soft delete (bkz. §12); kendi hesabı silinemez |
| `GET /v1/editors`, `GET /v1/editors/:username` | public | yalnızca public editörler; yayınlanmış konsept/rehber listesi |
| `GET /v1/guides/admin/all`, `POST/PATCH/DELETE /v1/guides/:id` | concept.read / concept.write (+publish) | yeni |
| `POST/PATCH/DELETE /v1/concepts` | concept.write (+publish) | `authorId` opsiyonel; `createdById/updatedById` set edilir |
| `GET /v1/community/profiles/:username` | public | gizli / pasif / silinmiş → 404; `me()` artık `kind` döner |

Tüm public author alanları `publicAuthorSelect` ile sınırlıdır: `id, profile{displayName, username,
avatarUrl, kind, jobTitle, editorActive, isPublic}`.

## 7. Admin paneli değişiklikleri

- **Hesaplar → Kullanıcılar** (`/kullanicilar`): liste (durum, rol, içerik sayıları), yeni kullanıcı (rol
  seçimi), rol güncelleme, askıya alma, hesap kapatma (soft delete).
- **Hesaplar → Editörler** (`/editorler`): editör oluşturma formu (ad, slug, e-posta, parola, unvan, uzmanlık,
  kısa/uzun bio, avatar, web sitesi, sosyal linkler, herkese açık, aktif), düzenleme, "Editör rolünü kaldır",
  public profile linki, içerik sayıları.
- **Editoryal → Rehberler** (`/rehberler`): rehber CRUD (durum, indexability, yazar seçimi).
- **Konseptler**: "Yazar (byline)" seçimi (yalnızca editörler listelenir; boşsa editörse aktör, değilse kurum).

## 8. Frontend değişiklikleri

- `/tr/editor/[slug]`: hero (avatar, unvan, bio, uzmanlık, yayın sayısı, son yayın, sosyal linkler), uzun bio,
  yayınladığı konseptler (ConceptCard) ve rehberler; ISR 300 sn; `generateStaticParams` aktif editörlerden.
- `EditorialByline` (konsept + rehber): yazar/kurum, unvan, okuma süresi, yayın/güncelleme tarihi,
  "Profili gör" (`<a href>` — crawlable). `AuthorBox` ("Yazar hakkında") yalnızca gerçek editörlerde.
- UGC atıfı: deneyim/soru/tartışma sayfalarındaki `UserMiniProfile` artık sözlükten "Paylaşan / Soran /
  Başlatan" etiketini ve locale-prefix'li, gizlilik kurallı `authorHref` linkini kullanır (editör bir deneyim
  paylaşırsa yine üye atfı). Aynı kurallar `UgcAttribution` bileşeninde (yanıt/yorum blokları için) hazır.
- `/tr/uye/<username>`: editör ise `/tr/editor/<slug>`'a 301; üyeler noindex kalır.
- `UserMiniProfile` (`packages/ui`) `href` prop'u kazandı (locale-prefix'li link).
- Sözlük anahtarları: `author.*`, `pages.editor.*` (tr/en).

## 9. Permission matrix

Bkz. [AUTHORS.md → İzin matrisi](./AUTHORS.md#i̇zin-matrisi). Özet:

| Yetenek | USER (member) | EDITOR | ADMIN |
| --- | :-: | :-: | :-: |
| Deneyim / soru / tartışma / yorum oluşturma (UGC) | ✓ | ✓ (üye olarak) | ✓ |
| Konsept / rehber oluşturma, düzenleme | – | ✓ | ✓ |
| Yayınlama (PUBLISHED) | – | ✓ (`concept.publish`) | ✓ |
| Kategori / konu / medya yönetimi | – | ✓ | ✓ |
| Moderasyon | – | – | ✓ (moderator rolü de) |
| Kullanıcı oluşturma, rol atama, editör oluşturma | – | – | ✓ (`user.write`, `role.manage`) |
| Administrator / super_admin atama | – | – | yalnızca super_admin |

## 10. Editorial workflow

`DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`. `concept.write` ile taslak/inceleme/arşiv, `concept.publish`
ile yayın (`assertCanPublish`). Yayındaki içeriğin silinmesi de publish izni ister. Editoryal rehberler
otomatik `APPROVED/PUBLIC`; moderasyon kuyruğuna girmez. Byline: `resolveEditorialAuthor` — verilen
`authorId` aktif editör değilse 400.

## 11. UGC workflow

Deneyimler `ExperienceStatus` (`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED | ARCHIVED`), soru/
tartışma/yorum `ModerationStatus` (`PENDING → APPROVED | REJECTED`) — mevcut moderasyon akışı değişmedi. `community.write` yeter; yazar = aktör.
Editör bir deneyim paylaşırsa o yine UGC'dir; editoryal byline/AuthorBox kullanılmaz. Üye editöre
yükseltilince geçmiş UGC'si tip değiştirmez.

## 12. Author ownership modeli

- `authorId` = public byline (yalnızca aktif editör; yoksa `null` → kurum imzası).
- `createdById` / `updatedById` = kim girdi / kim güncelledi (admin izi).
- Editör pasif → profil 404 + sitemap dışı; içerikte ad kalır, şemada kurum imzalar.
- Rol kaldırma → `kind=MEMBER`; `authorId` korunur.
- Soft delete → `status=DELETED`, `deletedAt`, roller/oturumlar silinir, profil `editorActive=false,
  isPublic=false`; içerik ve byline verisi silinmez (FK `SetNull` yalnızca hard delete'te).

## 13. SEO/schema değişiklikleri

- `articleJsonLd({ author: Person{name,url,@id} | Organization })`: editör → `Person @id /editor/<slug>#person`;
  editör yoksa `{ "@id": "<site>#organization" }` (sahte "Konsepthane" Person yok). Deneyimde üye Person
  (displayName, public ise url).
- `profilePageJsonLd`: `ProfilePage` → `mainEntity: Person{@id url#person, jobTitle, sameAs, worksFor}`.
- Editör sayfası index/follow + self-canonical; üye sayfaları noindex; gizli/pasif → 404.
- `scripts/seo-schema-check.mjs`: Article/DiscussionForumPosting author zorunlu; editoryal Person author
  `/editor/` linkli olmalı, profil 200 + indexable + aynı `@id`; ProfilePage yalnızca `/editor/`'da.
- `scripts/seo-audit.mjs`: `editorler` sitemap ailesi; indexable konsept/rehberde `Article.author` yoksa veya
  Person author `/editor/` linkli değilse **critical**; noindex editör sayfası **critical**.

## 14. Editor ProfilePage örneği

```json
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": "https://konsepthane.net/tr/editor/ayse-ozturk",
  "url": "https://konsepthane.net/tr/editor/ayse-ozturk",
  "dateCreated": "2026-08-29T00:00:00.000Z",
  "dateModified": "2026-08-29T10:00:00.000Z",
  "mainEntity": {
    "@type": "Person",
    "@id": "https://konsepthane.net/tr/editor/ayse-ozturk#person",
    "name": "Ayşe Öztürk",
    "url": "https://konsepthane.net/tr/editor/ayse-ozturk",
    "jobTitle": "Konsepthane Editörü",
    "description": "Doğum günü ve ev kutlaması konseptleri yazar.",
    "image": "https://konsepthane.net/uploads/ayse.jpg",
    "sameAs": ["https://instagram.com/…"],
    "worksFor": { "@id": "https://konsepthane.net/tr#organization" }
  }
}
```

Konsept sayfasında: `"author": { "@type": "Person", "name": "Ayşe Öztürk", "url": ".../tr/editor/ayse-ozturk",
"@id": ".../tr/editor/ayse-ozturk#person" }`, `"publisher": { "@id": ".../tr#organization" }`.

## 15. Sitemap/index policy

| Sayfa | robots | canonical | sitemap |
| --- | --- | --- | --- |
| `/tr/editor/<slug>` (aktif, public editör) | index, follow | self | `sitemap/editorler.xml` |
| `/tr/editor/<slug>` (pasif / gizli / silinmiş) | 404 | – | yok |
| `/tr/uye/<username>` (üye) | noindex, follow | self | yok |
| `/tr/uye/<username>` (editör) | 301 → `/tr/editor/<slug>` | – | yok |

Ayrı `editorler` ailesi seçildi: küçük ve nadir değişen bir küme; `sayfalar` ile karışmaz ve robots.txt
listesine otomatik girer.

## 16. Test sonuçları

### Statik kontroller

| Komut | Sonuç |
| --- | --- |
| `pnpm typecheck` (11 paket) | ✅ 11/11 |
| `pnpm lint` (10 paket, `--max-warnings=0`) | ✅ 10/10 |
| `pnpm --filter @ilham/api test` (vitest) | ✅ 28/28 — `rbac.spec.ts` (8), `editorial.spec.ts` (13), `permissions.spec.ts` (7) |
| `docker compose up -d --build web api admin` | ✅ üç konteyner healthy |
| `pnpm db:deploy` + `pnpm db:seed` | ✅ migration uygulandı, seed rbac kataloğuyla çalıştı (sahte editör/UGC üretmez) |

Birim testleri: admin `user.write`/`role.manage` sahibi; editör `concept.write`+`concept.publish` sahibi,
`user.write` değil; üye `community.write` sahibi, `concept.write` değil; `profileKindForRoles` yalnızca
`editor` rolünde EDITOR döner (admin → MEMBER); `PermissionGuard` allow/deny/all-required; `assertCanPublish`,
`resolveEditorialAuthor` (aktif olmayan/üye/bilinmeyen yazar → 400), `assertMayAssignRoles`
(üye/editör rol atayamaz, admin rolü yalnızca super_admin), `isPublicEditor`, `slugifyUsername`.

### Canlı smoke (geçici `smoke-editor` hesabı; test sonunda tüm satırlar silindi)

| # | Senaryo | Sonuç |
| --- | --- | --- |
| 1 | Admin editör oluşturur (`POST /v1/users`, roles=[editor]) | ✅ 201, `profile.kind = EDITOR` |
| 2 | Üye editör oluşturmaya çalışır | ✅ 403 |
| 3 | Editör konsept oluşturup yayınlar (`POST /v1/concepts`, PUBLISHED) | ✅ 201, `authorId` = editör |
| 4 | Üye konsept oluşturmaya çalışır | ✅ 403 |
| 5 | Üye deneyim oluşturur (`POST /v1/community/experiences`) | ✅ 201, `status = SUBMITTED` (moderasyon kuyruğu; editoryal `ContentStatus` değil). İlk deneme 400: test payload'ında `rightsConfirmed` eksikti — sistem hatası değil |
| 6 | `GET /v1/editors`, `GET /v1/editors/smoke-editor` | ✅ 200, konsept listede, `email`/`passwordHash` yok |
| 7 | `/tr/editor/smoke-editor` | ✅ 200, index, self-canonical, ProfilePage + `Person @id …#person`, konsepte `<a href>` |
| 8 | `/tr/konsept/smoke-editor-konsepti` | ✅ Article.author = editör Person (`#person`), byline `<a href="/tr/editor/…">`, "Yazar hakkında" |
| 9 | Seed konsepti (admin yazmış) | ✅ Article.author = `{ "@id": …#organization }`, byline "Konsepthane Editörleri", sahte Person yok |
| 10 | `/tr/uye/smoke-editor` | ✅ 308 → `/tr/editor/smoke-editor` |
| 11 | `sitemap/editorler.xml` | ✅ editör listede; `/tr/uye/derya-demo` noindex |
| 12 | Editör pasifleştirme (`PATCH editorActive=false`) | ✅ `/v1/editors/:u` 404, `/v1/editors` dışı, konsept 200 ve yazar adı korunur, `editorActive=false` |
| 13 | Rol kaldırma (`PUT roles=[member]`) | ✅ `kind = MEMBER`, `authorId` korunur |
| 14 | Soft delete (`DELETE /v1/users/:id`) | ✅ `status = DELETED`, konsept API 200, giriş 401, admin kendini silemez (400) |
| 15 | Soft delete sonrası web konsept sayfası | ⚠️ 200 döner; ISR (`revalidate = 300`) nedeniyle 5 dk boyunca önbellekteki Person author görünür, API `kind=MEMBER, editorActive=false` döndüğü için bir sonraki yeniden üretimde kurum imzasına geçer. İstenirse `revalidateTag` ile anlık geçersiz kılma eklenebilir (bkz. Sonraki adımlar). |

### SEO araçları

| Komut | Sonuç |
| --- | --- |
| `pnpm seo:audit --max 500` | ✅ 202 sayfa, 57 sitemap URL (editorler dahil), **0 critical**, 1 uyarı (`missing_h1 /tr/anket/...`, önceden var) |
| `pnpm seo:schema` (+ `/tr/editor/smoke-editor`, `/tr/konsept/smoke-editor-konsepti`) | ✅ "no problems" — ProfilePage/Person `@id` = canonical#person, editör Person author profili 200+indexable, seed konsept Organization author |
| `pnpm seo:render` (Playwright, 5 sayfa: ana sayfa, editör, 2 konsept, rehber) | ✅ server HTML = DOM |

### Sonraki adımlar (kapsam dışı bırakılanlar)

- Yayına çıkmadan önce `*.demo` üyeleri ve "Demo" etiketli UGC silinmeli (seed politikası).
- Editör/rol değişikliklerinde web önbelleğini anında geçersiz kılmak için `revalidateTag` köprüsü (API → web) eklenebilir.
- `CommentThread` (packages/ui) yorum yazarlarını hâlâ locale-prefix'siz `/uye/<u>` ile bağlıyor (proxy 308 ile çalışır); `href` prop'u ile düzeltilebilir.
- İlk gerçek editörler admin panelinden (`/editorler`) açıldığında `pnpm seo:schema /tr/editor/<slug>` ile doğrulanmalı.


## 17. Değişen dosyalar

### Yeni
- `packages/database/prisma/migrations/20260829120000_editorial_authors/migration.sql`
- `apps/api/src/common/editorial.ts`, `apps/api/src/common/public-author.ts`
- `apps/api/src/users/{users.controller,users.service,users.dto,users.module}.ts`
- `apps/api/src/guides/{guides.controller,guides.service,guides.dto,guides.module}.ts`
- `apps/api/test/rbac.spec.ts`, `apps/api/test/editorial.spec.ts`
- `apps/web/app/[locale]/editor/[slug]/page.tsx`, `apps/web/components/author-byline.tsx`, `apps/web/lib/editors.ts`
- `apps/admin/app/(panel)/kullanicilar/page.tsx`, `apps/admin/app/(panel)/editorler/page.tsx`, `apps/admin/app/(panel)/rehberler/page.tsx`
- `docs/AUTHORS.md`, `docs/AUTHOR_SYSTEM_REPORT.md`

### Değişen
- `packages/database/prisma/schema.prisma` (ProfileKind, Profile editör alanları, Concept/Guide createdBy/updatedBy)
- `packages/database/prisma/seed.ts` (rbac kataloğunu kullanır), `packages/database/src/index.ts` (RBAC kataloğu)
- `packages/seo/src/index.ts` (`articleJsonLd({ author })`, `profilePageJsonLd`)
- `packages/shared-types/src/index.ts` (ProfileKind, CommunityAuthor, EditorProfile/EditorSummary, ConceptDetail.author.id)
- `packages/ui/src/index.tsx` (`UserMiniProfile.href`)
- `apps/api/src/app.module.ts`, `apps/api/src/concepts/{concepts.controller,concepts.service}.ts`, `apps/api/src/concepts/dto/concept.dto.ts`, `apps/api/src/community/community.service.ts`, `apps/api/test/permissions.spec.ts`
- `apps/web/app/[locale]/konsept/[slug]/page.tsx`, `rehber/[slug]/page.tsx`, `deneyim/[slug]/page.tsx`, `soru/[slug]/page.tsx`, `tartisma/[slug]/page.tsx`, `uye/[username]/page.tsx`
- `apps/web/app/sitemap.ts` (`editorler` ailesi), `apps/web/app/globals.css`, `apps/web/lib/community.ts`, `apps/web/messages/{tr,en}.ts`
- `apps/admin/app/(panel)/layout.tsx` (Hesaplar bölümü, Rehberler), `apps/admin/app/(panel)/konseptler/page.tsx` (yazar seçimi)
- `scripts/seo-audit.mjs`, `scripts/seo-schema-check.mjs`, `docs/SEO.md`

