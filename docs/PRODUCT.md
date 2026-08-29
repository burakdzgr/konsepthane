# Product definition

## Mission

Konsepthane helps people in Türkiye answer “Bu özel günü nasıl düzenlemeliyim?” with trustworthy,
visual and actionable inspiration. It combines curated concepts, useful products, community event
stories and—later—qualified local services without collapsing these distinct content types into a
generic post model.

## Primary audiences

- Planners: parents, couples, families and friends researching an occasion.
- Contributors: members publishing a photo-rich Experience or platform-quality concept.
- Editors and moderators: people protecting usefulness, safety and index quality.
- Vendors: future service providers and venues receiving qualified leads.

## Core loop

Discover an SEO landing or category → inspect a concept → understand materials and budget → save
it → arrange the event → publish a structured, photo-rich Experience → help the next planner. Search, collections,
comments and follows strengthen this loop but do not replace it.

## Milestone 1 scope

Milestone 1 proves the technical foundation and the Category → Concept vertical slice: authenticated
admin management, public category discovery, public concept detail, SEO metadata, media abstraction,
RBAC, seeds, health checks and deployable local infrastructure.

Phase 2'de açıkça kapsam dışı olanlar ödeme, tedarikçi paneli, lead dağıtımı, pazaryeri işlemleri,
affiliate, sponsorlu içerik ve üretim reklam dağıtımıdır. Bu alanların özellik bayrakları kapalıdır.

## Success measures

- A new developer can run the stack from documented commands.
- An administrator can sign in and create, edit and publish categories and concepts.
- A visitor can browse fast, accessible Turkish category and concept pages.
- Only explicitly approved pages are indexable; draft content never leaks into sitemaps.
- Domain and infrastructure modules can grow without splitting into premature microservices.

## Phase 2 ürün kimliği: editoryal-first

Konsepthane'nin birincil yüzeyi yüksek kaliteli modern bir kutlama içerik platformudur. Konseptler, görsel
ilham, tema sayfaları, editoryal koleksiyonlar ve rehberler keşfin merkezindedir. Topluluk bu içeriklerin
altında üç ayrı niyetle yaşar: kısa `Yorum`, yardım isteyen ve bağımsız yanıtları olan `Question`, gerçekten
uyguladığını en az bir fotoğrafla kanıtlayan birinci sınıf `Experience`.

Ana ürün döngüsü: konsepti keşfet → kaydet/koleksiyona ekle → kutlamayı uygula → fotoğraflı deneyimini
paylaş → aynı konsepti araştıranların sorularına ve kararlarına yardımcı ol. `/sorular` bağımsız Q&A,
`/deneyimler` ise görsel-first gerçek uygulama alanıdır; kronolojik forum akışı ana sayfada yer almaz.

Örnek seed içerikleri yalnızca geliştirme ortamında yüklenir (`SEED_SAMPLE_DATA=1`); yayın veritabanına girmez. Ticaret, pazaryeri, affiliate,
reklam, lead üretimi ve sponsorlu içerik bu aşamada özellik bayraklarıyla kapalıdır.
