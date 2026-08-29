# Kullanıcılar, roller, editörler ve içerik sahipliği

Konsepthane'de içerik kaynağı her zaman şeffaftır: editoryal içerik gerçek bir editörün
(veya kurumun) imzasını taşır, topluluk içeriği (UGC) onu paylaşan üyenin adıyla gösterilir.
Bu belge sistemin kurallarını ve teknik karşılıklarını tanımlar.

## Kavramlar

| Kavram | Karşılığı |
| --- | --- |
| **Rol** | `Role` tablosu (`packages/database/src/index.ts (RBAC bölümü)` kataloğu). `member`, `contributor`, `editor`, `moderator`, `seo_manager`, `administrator`, `super_admin`. |
| **İzin** | `Permission` tablosu; JWT içinde `permissions[]` olarak taşınır, `PermissionGuard` + `@RequirePermissions()` ile sunucu tarafında zorlanır. |
| **Editör** | `editor` rolüne sahip kullanıcı. Rol atandığında `Profile.kind = EDITOR` türetilir; rol kaldırılınca `MEMBER` olur. |
| **Editör slug'ı** | `Profile.username` (tek slug, `/tr/uye/<u>` üye sayfası editörse `/tr/editor/<u>`'ya 301 olur). |
| **Public editör** | `kind = EDITOR && editorActive && isPublic && username && user.status = ACTIVE && !deletedAt` (`isPublicEditor`). Sadece bu profiller `/editor/` sayfası, ProfilePage şeması ve sitemap girdisi alır. |
| **Byline (`authorId`)** | Konsept/rehberde **public gösterilen** yazar. Sadece aktif editör olabilir. Boşsa sayfa kurum yazarına düşer ("Konsepthane Editörleri" / `Organization`). |
| **`createdById` / `updatedById`** | Hesap izi (kim girdi, kim güncelledi). Public'te gösterilmez; admin/audit içindir. |

## İzin matrisi

| İzin | member | contributor | editor | moderator | seo_manager | administrator | super_admin |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| community.read / write | ✓ | ✓ | – | ✓ (read) | – | ✓ | ✓ |
| community.moderate | – | ✓ | – | – | – | ✓ | ✓ |
| concept.read | – | ✓ | ✓ | – | – | ✓ | ✓ |
| concept.write | – | ✓ | ✓ | – | – | ✓ | ✓ |
| concept.publish | – | – | ✓ | – | – | ✓ | ✓ |
| category.read / write | – | – | ✓ | – | – | ✓ | ✓ |
| media.manage | – | – | ✓ | – | – | ✓ | ✓ |
| moderation.read / manage | – | – | – | ✓ | – | ✓ | ✓ |
| seo.read / manage | – | – | – | – | ✓ | ✓ | ✓ |
| user.read / write | – | – | – | – | – | ✓ | ✓ |
| role.manage | – | – | – | – | – | ✓ | ✓ |
| system.manage | – | – | – | – | – | – | ✓ |

Kaynak: `rolePermissions()` (`packages/database/src/index.ts (RBAC bölümü)`); seed, API ve testler aynı
katalogu kullanır. Ek kurallar (`users.service.ts`):

- `member` dışı rol atamak `role.manage`, `administrator`/`super_admin` atamak `system.manage` ister.
- Kendi hesabını silemezsin; rol değişikliği o kullanıcının refresh oturumlarını iptal eder.

## Editoryal iş akışı (konsept, rehber)

`DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED` (`ContentStatus`).

- `concept.write`: oluşturma/düzenleme/arşivleme.
- `concept.publish`: `PUBLISHED` yapabilme (`assertCanPublish`). Yayındaki içeriği silmek de bu izni ister.
- `authorId` verilmezse aktör editörse kendisi, değilse `null` (kurum imzası). Verilirse aktif editör olmak zorundadır (`resolveEditorialAuthor`).
- Editoryal rehberler `moderationStatus = APPROVED`, `visibility = PUBLIC` ile oluşturulur; UGC moderasyon kuyruğuna girmez.

## UGC iş akışı (deneyim, soru, tartışma, yorum)

Deneyimler `ExperienceStatus` (`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED | ARCHIVED`), soru /
tartışma / yorum `ModerationStatus` (`PENDING → APPROVED | REJECTED`); editoryal `ContentStatus` ile karışmaz.

- `community.write` yeterlidir; üye kendi içeriğini oluşturur, `authorId = actor`.
- Public gösterim: "Paylaşan / Soran / Yanıtlayan / Başlatan: <displayName>" (`UgcAttribution`). Gerçek ad istenmez; profil gizliyse link verilmez.
- Editör olan bir üye UGC paylaşırsa o içerik yine UGC'dir; editoryal blok/byline kullanılmaz.
- Üye editöre yükseltilince geçmiş UGC'si editoryal içerik olmaz (tablo/tip değişmez).

## Yazar sahipliği ve silme

- Editör pasifleştirme (`editorActive=false`) → profil sayfası 404, sitemap'ten düşer, içerikte yazar adı kalır, Article.author kuruma döner.
- Rol kaldırma → `kind = MEMBER`; içerikler yazar bağını (`authorId`) korur, public'te kurum imzasına döner.
- Soft delete (`DELETE /v1/users/:id`) → `status = DELETED`, `deletedAt`, roller ve oturumlar kaldırılır, profil `editorActive=false, isPublic=false`; içerik satırları ve byline verisi silinmez (`onDelete: SetNull` sadece hard delete durumunda).

## SEO / şema

- `/tr/editor/<slug>`: index,follow, self-canonical, `editorler` sitemap ailesi, `ProfilePage` → `mainEntity` = `Person @id <url>#person`, `worksFor` = `Organization @id <site>#organization`.
- `/tr/uye/<username>`: noindex (üye), editörse 301 → `/tr/editor/<slug>`; gizli profiller 404.
- Konsept/rehber `Article.author`: public editör varsa `Person {@id: /editor/<slug>#person, url}`; yoksa `{ '@id': <site>#organization }`. Hiçbir zaman "Konsepthane" adlı sahte Person yok.
- Deneyim `Article.author`: üye `Person {name: displayName, url?: /uye/<u>}` (gizliyse url yok).
- `pnpm seo:schema` ve `pnpm seo:audit` bu kuralları doğrular (Person author → `/editor/` profil 200 + indexable + aynı `@id`).

## API uçları

| Uç | İzin |
| --- | --- |
| `GET /v1/users`, `GET /v1/users/roles`, `GET /v1/users/:id` | `user.read` |
| `POST /v1/users` (kullanıcı + profil, roller) | `user.write` (+ rol kuralları) |
| `PATCH /v1/users/:id` (profil/durum) | `user.write` |
| `PUT /v1/users/:id/roles` | `role.manage` |
| `DELETE /v1/users/:id` (soft) | `user.write` |
| `GET /v1/editors`, `GET /v1/editors/:username` | public (sadece public editörler) |
| `GET /v1/guides/admin/all`, `POST/PATCH/DELETE /v1/guides` | `concept.read` / `concept.write` (+publish) |
| `POST/PATCH/DELETE /v1/concepts` | `concept.write` (+publish) |

## Seed politikası

Seed sahte editör ve sahte UGC üretmez. Editoryal örnek içerik `super_admin` hesabıyla girilir ve
public'te kurum imzasıyla ("Konsepthane Editörleri", `Organization` author) görünür. Mevcut
`*.ornek` örnek üye hesapları ve örnek deneyim/soru kayıtları geliştirme içindir; yayına
çıkmadan önce silinmelidir. Gerçek editörler admin panelinden (`/editorler`) oluşturulur.
