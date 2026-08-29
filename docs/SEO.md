# SEO architecture

This implementation follows the current Google Search Central guidance. The primary references are
the [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=tr),
[canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=tr),
[structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=tr),
and Google's [generative AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## Index policy

Indexability is an editorial decision, not the accidental output of filters. Categories and published
concepts may be indexable. Filtered/sorted list URLs canonicalise to the unfiltered hub (see
"Faceted navigation"). Taxonomy hubs (`/konu/<slug>`) and curated landing pages run the deterministic
hub policy `shouldIndexHub` in `@ilham/seo` — items per type, editorial description, images,
featured/inbound-link support, editorial override, duplicate detection — instead of a bare item
count. The page metadata, the topic index `ItemList` and the sitemap shard all call the same
function (`apps/web/lib/hub-index.ts`), so a hub is never indexable in one place and `noindex` in
another. Unknown category × topic combinations return 404; they never enter a sitemap.

## Faceted navigation and curated landing pages

Two different things share the list templates:

1. **UX filters** — `?kategori=`, `?etkinlik=`, `?mekan=`, `?sekme=`, `?sirala=` (and any future
   `?yas=`, `?tema=`, `?renk=`). They are crawlable (so their links carry equity) but never
   independent landing pages: canonical always points at page 1 of the unfiltered hub, they are not
   in any sitemap, and search-result queries (`/kesfet?…`) are additionally disallowed in
   `robots.txt`. Rule of thumb: a filter URL may exist for people, never for Google.
2. **Curated landing pages** — `apps/web/content/landing-pages.ts` is the only source. An entry is a
   category × topic pair with real search demand _and_ editorial intro copy; it renders at
   `/kategori/<category>/<topic>` with self-canonical, breadcrumbs, `ItemList`, links from the
   category hub and the topic hub, and a sitemap entry — but only while the hub policy says
   `indexable` (thin entries degrade to `noindex,follow` automatically). Nothing is generated from
   arbitrary combinations.

## URL and slug policy

Public URLs are Turkish, lowercase and without trailing slashes (Next.js redirects `/x/` to `/x`).
Slug generation maps Turkish characters (`çğıöşü`) correctly, removes combining marks and prevents
duplicates. Manual overrides use the same validation. Changing the slug of a published concept or
category writes a `slug_history` row (`SeoService.recordSlugChange`, chains collapsed); the web app
asks `GET /v1/seo/redirect?path=` before returning a 404 and answers with a single locale-prefixed 308. Paths represent curated intent rather than mirroring database hierarchy blindly.

Editors can override title, description and robots per entity through `seo_metadata`
(`PUT /v1/seo/metadata/:entityType/:entityId`); public concept responses carry it as `seo` and
`applySeoOverride` merges it into page metadata.

## Page contract

Every indexable page owns a unique title, H1, meta description, canonical, robots value,
breadcrumbs, useful introduction, main content and related links. Landing pages can additionally own
sections, FAQ, curated concepts and products. Thin pages remain noindex until they meet quality gates.

`localeMetadata` produces an absolute self-canonical, locale-specific Open Graph URL, large image
preview permission and unrestricted snippets for indexable pages. Query-driven discovery pages point
to the stable hub canonical or remain `noindex,follow`; they never create uncontrolled landing-page
fan-out.

## Authors and editors

Author/byline rules (who may be a `Person` author, when the `Organization` signs, editor
`ProfilePage` pages, member noindex, `editorler` sitemap family, soft-delete policy) live in
[AUTHORS.md](./AUTHORS.md). `pnpm seo:schema` and `pnpm seo:audit` enforce them.

## Site identity

The public product name is always `Konsepthane`. The `/tr` home page emits one `WebSite` entity and
one linked `Organization` entity with stable IDs and a crawlable 512×512 logo. Metadata,
`og:site_name`, visible header/footer branding and home H1 copy use the same identity. Article
publishers link back to the locale home organization entity.

## Structured data

Use `BreadcrumbList` on navigable content, `ItemList` on genuine collections, `Article` on editorial
concepts/guides and real experience narratives, `QAPage` on a single answerable question, and
`DiscussionForumPosting` on user-created non-Q&A discussion threads. `ImageObject`, `Person`,
`Organization` or `LocalBusiness` is emitted only when visible page facts support it.
Review/aggregate rating markup requires real eligible reviews. FAQ rich-result markup is not emitted
merely because an FAQ block exists.

## Internal link graph

Taxonomy entities and typed relationship edges (theme-to-cake, age-to-gift, concept-to-story) produce
candidate links. Editorial weight, publication state and page relevance rank candidates. Templates
enforce link budgets and avoid orphan pages; admins may pin or suppress edges. Link output is
observable and never generated from arbitrary combinatorial facets.

Current templates implement four deliberate layers:

1. Global navigation and footer links point to stable hubs and trust pages.
2. Category pages link to concepts, filtered experience discovery and related questions.
3. Detail pages link back to their canonical category/hub and forward to related concepts,
   experiences and questions.
4. Public collections localize every saved content URL before rendering it, avoiding redirect hops.

Anchor text describes the destination; generic “click here” anchors are avoided. Internal links
always point to canonical locale-prefixed URLs.

## External link policy

Editorial pages link contextually to primary official sources for food safety, public health and
children's personal data. These trusted citations are normal followed links with descriptive anchor
text. `noopener noreferrer` protects new-tab navigation; `nofollow` is not used to hide editorial
endorsements. Any future user-rendered outbound HTML must use `rel="ugc nofollow"` unless moderators
explicitly promote it to an editorial citation. The public `/tr/editoryal-standartlar` page explains
the source hierarchy and correction policy.

## Sitemaps and rendering

Sitemaps are sharded by page family (`/sitemap/<family>.xml`, listed in `robots.txt`), walk every
API page (no 50-item cap) and never fall back to demo data. `lastmod` reflects meaningful content
changes. Home, concept, guide, experience, question, discussion, topic, collection and trust pages
are rendered statically with `revalidate = 300`; hub pages with filters/pagination are dynamic but
read cached API data. Nothing in a page reads cookies: the header account menu, save/like toggles,
boards and member-only forms are client islands hydrated from `/api/session`. Images go through
`next/image` (`SmartImage`, `fill` + `sizes`, AVIF/WebP, remote bucket allow-listed) so every image
has intrinsic dimensions; the LCP candidate is marked `priority`.

Each sitemap entry emits only `loc` and `lastmod`. Paginated hubs use `?sayfa=N`: page 1 keeps the
hub canonical, page N is self-canonical with a page suffix in the title; pages link each other with
plain `<a href>` (plus informational `rel=prev/next`), out-of-range pages return 404. Filtered or
sorted variants (`?kategori=`, `?etkinlik=`, `?mekan=`, `?sekme=`, `?sirala=`) always canonicalise to
page 1 of the unfiltered hub, so `?sayfa=N` is only ever a canonical URL for the plain list. Category
chips on `/fikirler` link to `/kategori/<slug>` hubs so every published category has a crawlable
inbound link; a crawl-based audit (`linkaudit.mjs`) checks orphans, empty anchors and sitemap parity. Dynamic detail pages use the record's persisted
`updatedAt`; they never use application startup, build or deploy time. Hub pages use the latest
`updatedAt` among records visibly listed on that page. Truly static trust pages use an explicit
editorial date constant that is changed only when the page itself changes.

## Topluluk kalite kapısı

Topluluk detayları yalnızca `PUBLIC`, `APPROVED`, özgün kanonik URL'li ve yeterli başlık/gövde
uzunluğundaysa indekslenir. Spam, kopya, ince, cevapsız veya incelemedeki içerik erişilebilir olsa bile
`noindex,follow` kalır. Filtre ve kişisel akış URL'leri indekslenmez. Soru sayfasında `QAPage` yalnızca
görünür yanıt olduğunda üretilir; kabul edilmiş yanıt gerçekten aynı soruya ait olmalıdır.

Kalite kapısı `evaluateCommunityIndexability` (`@ilham/seo`) ile API'de uygulanır: soru ve tartışma
oluşturulurken, deneyim ise moderasyon onayında (editör açıkça seçmediyse) değerlendirilir; kopya
başlık ve spam sinyalleri (3+ bağlantı, tekrarlanan karakter) `NOINDEX` bırakır.

Sitemap yalnızca veri tabanında `INDEX` olan onaylı soru/tartışmaları, yayınlanmış konsept/rehberleri,
kalite kapısını geçen onaylı Experience kayıtlarını, en az üç içeriği olan konu sayfalarını ve özgün
açıklaması ile en az üç öğesi bulunan herkese açık koleksiyonları içerir. Kullanıcı kaydedilenleri,
bildirimler, oluşturma, arama ve giriş sayfaları sitemap'e girmez.

Konseptler birincil SEO varlığıdır ve görünür olgularla `Article` + `BreadcrumbList` üretir. Gerçek
sorular, yanıtlar, deneyim fotoğrafları ve yorumlar konsept sayfasının özgün değerini artırır. Her
Experience otomatik indekslenmez: moderasyon onayı, yeterli metin/görsel, özgünlük, mahremiyet ve
editoryal `IndexabilityStatus.INDEX` gerekir. Kanonik deneyim yolu `/deneyim/[slug]` biçimindedir;
eski `/organizasyon/[slug]` yolları yönlendirme olarak korunur.

## Multilingual readiness

`localeMetadata(locale, path, { translations })` emits hreflang only for locales in which the page
really exists (defaults to `indexableLocales`, today `['tr']`); `x-default` follows the default
locale. Every locale is self-canonical; nothing ever canonicalises across languages. Unprefixed
legacy paths redirect to the visitor's explicit language choice (cookie) or the default — never by
`Accept-Language` or IP, so crawlers and shared links always land on the same URL. Opening `/en`
later = translate content, add `en` to `indexableLocales`, pass `translations` per record.

## Crawl control (robots.txt vs meta robots)

One control per URL class, never two that contradict each other. Private, personal and thin HTML
pages (`/giris`, `/kaydedilenler`, `/bildirimler`, `/olustur`, `/uye/…`, `/anket/…`, the `/kesfet`
hub) are **crawlable + `noindex`** and never in a sitemap, so Google can always read the directive.
Search-result URLs (`/kesfet?…`) are the only deliberate `robots.txt` block: the query/facet space is
unbounded, i.e. a crawl trap, so crawl budget — not indexing — is the concern; templates emit no
`<a href>` to such URLs (search is reached through the GET form), and the page's `noindex` is only
defence in depth. `/admin` and `/api/` have no indexable HTML and are blocked in `robots.txt`.

## Article image policy

`Article.image` must depict the content: concept hero image → content-specific OG image → a real
in-content image (experience photos). When none exists (guides today) the property is omitted —
never filled with the brand card or logo. `pnpm seo:schema` reports a missing image as information
and fails on a generic brand image.

## Performance measurement: lab vs field

`pnpm seo:cwv` runs Playwright against a production build with a cold browser context per run,
CDP network throttling enabled _before_ navigation (applies to the document request), CPU
throttling, three runs per page and medians for TTFB / FCP / LCP / CLS plus a scripted interaction
sequence that reports the worst event-timing duration as a lab INP proxy. These are **lab numbers**
(synthetic device, local server, no real network path); they catch regressions and rank pages
against each other. Field data (CrUX via Search Console's Core Web Vitals report, or an RUM
`web-vitals` beacon once analytics is added) is the only source for the 75th-percentile values Google
uses for ranking, and the two must not be mixed in reports.

## Pre-deployment audit

`pnpm seo:audit` crawls the site like Googlebot's first pass (server HTML), compares it with every
sitemap shard and fails (exit 1) on broken links, redirect chains, missing titles/canonicals,
noindex or redirecting URLs in sitemaps, orphan sitemap URLs, canonicals pointing at 404/redirects
and conflicting robots/canonical; warnings cover duplicate titles/canonicals, multiple/missing H1,
empty anchors and indexable pages absent from sitemaps. `pnpm seo:render` (Playwright) checks that
hydration does not change title, description, canonical, robots, hreflang, H1, JSON-LD, breadcrumb,
images or internal links.

## Çok dilli URL'ler

Public URL'ler dil önekiyle yaşar (`/tr/…`, `/en/…`); öneksiz eski yollar 308 ile tercih edilen dile
yönlendirilir. Canonical ve `hreflang` alternatifleri `localeMetadata` ile üretilir. Yalnızca
`indexableLocales` içindeki tam çeviriler hreflang kümesine ve sitemap'e girer; eksik İngilizce içerik
self-canonical ama `noindex,follow` kalır. Alt alan adı yerine alt dizin tercihi ve ayrıntılar:
`docs/I18N.md`.

## GEO and generative search

Google states that the same SEO foundations apply to AI Overviews and AI Mode; no separate “GEO”
markup or AI-only file is required. Konsepthane therefore optimizes for answerability without creating
search-only pages: concise leads, descriptive headings, first-hand experience blocks, visible authors,
source citations, high-quality images, crawlable internal links and structured data that matches the
visible page. Indexable pages allow full snippets and large image previews so they remain eligible for
generative search features. Scaled low-value topic combinations remain blocked by the existing quality
gates.

## Güven sayfaları ve varlık doğrulama

`/hakkimizda`, `/iletisim`, `/gizlilik` (KVKK aydınlatma) ve `/kullanim-kosullari` içerikleri
`apps/web/content/trust.ts` içinde iki dilde tutulur; yayın öncesi hukuki inceleme gerekir. Kimlik
bilgileri (`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_SOCIAL_*`, `NEXT_PUBLIC_LEGAL_NAME`) `lib/site.ts`
üzerinden `Organization` şemasına `sameAs`, `contactPoint`, `address` olarak girer; boş değerler
basılmaz. Varsayılan sosyal görsel `app/opengraph-image.tsx` ile PNG üretilir ve `localeMetadata`
her sayfaya açıkça ekler (sayfa düzeyindeki `openGraph` nesnesi dosya tabanlı görseli ezdiği için).

## Yayın öncesi son adım

Search Console doğrulaması (`metadata.verification`), analitik ve Core Web Vitals raporlaması
bilinçli olarak yayına çıkmadan hemen önce eklenir; kod tarafında bunlara bağımlılık yoktur.
