# Domain model

## Content families

`Concept` is platform/editorial inspiration with structured planning data. `Experience` is a member's
photo-backed real implementation and moderation lifecycle. `Article` and `Guide` are editorial narratives.
`SeoLandingPage` is an explicitly registered query/curation surface. Products, vendors and venues are
commercial entities. They intentionally do not share one “posts” table.

## Milestone 1 aggregate

- `Category`: hierarchical navigation node with localized name, stable slug, status and SEO data.
- `Concept`: structured inspiration assigned to one primary category, with status, summary,
  description, budget range and hero media.
- `MediaAsset`: storage-neutral metadata and ownership; binary data stays in object storage.
- `SeoMetadata`: one-to-one metadata for supported entity types, with canonical and robots controls.
- `SlugHistory`: old path to current destination mapping, suitable for 301 redirects.
- `User`, `Role`, `Permission`: authentication identity and centralized RBAC assignments.
- `RefreshSession`: hashed refresh token record for rotation and global/session invalidation.
- `AuditLog`: immutable record of security-sensitive and admin mutations.

Categories and concepts use UUID identifiers, optimistic `version`, explicit publish state and
timestamps. Slugs are unique within an entity family. Removing published content defaults to archive;
hard delete is reserved for unpublished mistakes and privacy workflows.

## Lifecycle

Concept: `DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`. Only editors with publish permission can enter
`PUBLISHED`. Experiences use the distinct moderation lifecycle requested by the product:
draft, submitted, under review, approved, rejected and archived.

## Future aggregates

- Planning: event types, themes, styles, colours, age groups, audiences and relationship edges.
- Community: event stories, collections with ordered polymorphic references, comments, ratings,
  follows, notifications and reports.
- Commercial: provider-neutral products/affiliate links, vendors, services, locations, venues and
  leads; marketplace offers can later reference these identities.
- Governance: moderation cases/actions, sponsorship disclosures, ad placements, consent records,
  retention workflows and feature flags.

Cross-domain polymorphism uses an explicit `entityType + entityId` only for infrastructure records
(SEO, media ownership, audit targets). Business aggregates use real foreign keys wherever integrity
matters.

## Topluluk agregaları

- `Question` gerçek `Answer` yabancı anahtarlarına ve tekil kabul edilmiş yanıta sahiptir.
- `Discussion` yorum, takip, kilit ve sabitleme sayaçlarını taşır.
- `Poll` seçenek ve oyları gerçek yabancı anahtarlarla korur; kullanıcı başına tek oy vardır.
- `Guide`, `Concept` ve `Experience` kendi yayın iş akışlarını korur.
- `Topic` içerik aileleri arasında bir ilişki grafiği kurar.
- `ContentReaction`, `ContentSave`, `ContentTopic` ve `ContentReport` tipli çapraz bağlantılardır.
- `ModerationCase`, not ve eylemleri; `UserSanction` süreli yaptırımları saklar.

Yayın durumu, topluluk görünürlüğü, moderasyon durumu ve indekslenebilirlik ayrı alanlardır. Sayaçlar okuma
performansı için denormalizedir; ilişki satırları gerçek kaynaktır ve uzlaştırılabilir.

## Experience ve bağlamsal katkılar

`Experience` zorunlu `authorId`, en az bir `ExperienceImage`, isteğe bağlı `conceptId` ve `eventTypeId`
taşır. Şehir, mekân türü, misafir sayısı, bütçe, tema yorumu, renkler, ipuçları, işe yarayanlar ve
değiştirilecekler bağımsız alanlardır. `Experience` yorum değildir; tepki, kaydetme, raporlama, profil,
moderasyon ve SEO yaşam döngüsüne sahip ayrı bir agregadır. `Question` isteğe bağlı `conceptId`,
`eventTypeId` ve `QuestionImage` taşır. Normal yorumlar ortak `Comment` ağacını kullanır.
