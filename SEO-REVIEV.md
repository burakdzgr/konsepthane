You are acting as the Senior Technical SEO Engineer, Web Performance Engineer, and GEO/Structured Data Architect for Konsepthane.net.

IMPORTANT:

The project already has a technical SEO architecture that has been audited and is largely healthy.

DO NOT redesign the SEO architecture from scratch.
DO NOT replace working implementations without a concrete reason.
DO NOT make speculative changes.
DO NOT remove existing working pagination, internal linking, canonical, sitemap or robots logic unless you can prove it is incorrect.

Your job is to inspect the CURRENT IMPLEMENTATION in the repository and improve only the areas described below.

Project:

Konsepthane.net

Primary language currently:
Turkish

Current URL architecture:
https://konsepthane.net/tr/

Future language:
https://konsepthane.net/en/

Konsepthane is a content, discovery, inspiration, UGC and planning platform around:

- birthdays
- children's birthdays
- first birthdays
- birthday themes
- baby shower
- gender reveal
- engagement
- söz
- nişan
- kına
- bridal events
- bachelorette
- party decoration
- balloons
- gifts
- cakes
- party food
- venues
- event services
- user experiences
- user boards
- questions and answers

The platform must scale to tens or hundreds of thousands of pages without creating crawl/index bloat.

==================================================
CURRENT HEALTHY IMPLEMENTATIONS — DO NOT BREAK
==================================================

The latest internal crawl audit reports approximately:

- 189 crawlable pages
- 12,102 internal href links
- 0 orphan URLs
- 0 anchorless links after fixes
- 0 sitemap/indexable URL mismatches
- no internal nofollow
- no broken internal links
- no 3xx/4xx redirect chains
- pagination URLs are crawlable
- pagination pages are self-canonical
- out-of-range pagination returns 404
- critical navigation uses real <a href=""> links
- breadcrumbs exist
- sitemap contains canonical/indexable pages
- filtered URLs generally canonicalize to clean hub URLs

These are GOOD.

Preserve them unless a real implementation bug is found.

==================================================
TASK 1 — SERVER HTML VS RENDERED DOM SEO AUDIT
==================================================

The previous crawler inspected only server-rendered HTML.

Google renders JavaScript too.

Perform a comparison between:

1. Raw server HTML
2. Browser-rendered DOM after hydration

Test representative page types:

- homepage
- category page
- topic /konu/ page
- concept/detail page
- pagination page
- questions listing
- question detail
- experience page
- profile page
- board page if available
- filtered listing URL

Verify that hydration does NOT unexpectedly change:

- <title>
- meta description
- canonical
- robots meta
- hreflang
- H1
- structured data
- breadcrumb
- important text content
- internal href links
- image URLs
- alt text

Especially verify:

SERVER HTML canonical
=
RENDERED DOM canonical

and:

SERVER robots
=
RENDERED robots

There must never be conflicting canonical instructions between initial HTML and JavaScript.

If differences exist:
fix them at source.

Prefer SEO-critical metadata being generated server-side.

==================================================
TASK 2 — FACETED NAVIGATION / FILTER URL STRATEGY
==================================================

Inspect all filtering and sorting parameters, including examples such as:

?kategori=
?etkinlik=
?mekan=
?sekme=
?sirala=
?yas=
?tema=
?renk=
?cinsiyet=

Do NOT blindly generate indexable URLs for arbitrary filter combinations.

Goal:

Prevent crawl explosion while allowing high-search-demand combinations to become real SEO landing pages.

Separate the system into TWO concepts:

A) UX FILTERS

Example:

/tr/fikirler?yas=1&tema=ayicik&renk=bej

These should normally NOT become independent SEO landing pages.

They should consolidate appropriately to the nearest canonical hub.

B) CURATED SEO HUBS

When a combination has actual search demand and sufficient content, create a clean permanent URL.

Examples:

/tr/dogum-gunu/1-yas/
/tr/dogum-gunu/1-yas/kiz/
/tr/dogum-gunu/ayicik/
/tr/dogum-gunu/safari/
/tr/baby-shower/
/tr/nisan/
/tr/kina/

These pages should:

- have clean URLs
- be internally linked
- have self canonical
- be indexable
- appear in sitemap
- contain unique useful content

DO NOT convert arbitrary faceted combinations into indexable pages automatically.

Review whether filtered pages currently use:

canonical to hub

or

noindex, follow

and choose the safest implementation for each page type.

Do not change working canonical behavior unnecessarily.

Document the final rule.

==================================================
TASK 3 — REPLACE SIMPLE CONTENT COUNT INDEXABILITY RULE
==================================================

There appears to be logic where topic pages with fewer than approximately 3 contents may become:

noindex, follow

Do NOT rely exclusively on:

contentCount >= 3

for deciding indexability.

Create a more robust indexability policy.

Indexability should consider:

- unique editorial content
- number of useful concepts/items
- search demand / SEO relevance
- unique images
- user-generated content
- questions / answers
- experience entries
- internal link support
- page uniqueness
- duplicate/thin-content risk

You do NOT need to build an overly complex machine-learning system.

Create a clean deterministic function / service / policy that can evolve.

For example:

shouldIndexTopicPage()

with clear criteria and comments.

Avoid thousands of thin indexable taxonomy pages.

At the same time, do not noindex a genuinely useful page simply because it currently has only 2 items.

Document this logic.

==================================================
TASK 4 — STRUCTURED DATA ARCHITECTURE AUDIT
==================================================

Audit all existing schema.org JSON-LD.

Create a PAGE TYPE → SCHEMA TYPE matrix.

Possible schemas include:

Organization
WebSite
WebPage
BreadcrumbList
Article
BlogPosting
ImageObject
ItemList
Person
ProfilePage
QAPage
Question
Answer
DiscussionForumPosting
VideoObject

IMPORTANT:

Do NOT add schemas merely because they exist.

Only add structured data when the visible page content satisfies the schema requirements.

Examples:

QAPage should only be used where:

- one main question exists
- users can submit answers
- answers are visible

Do not use QAPage for editorial FAQ-style content.

Article/BlogPosting should only be used for appropriate editorial content.

ProfilePage should correctly describe the user/profile entity.

ItemList can be used for appropriate collection/hub pages.

BreadcrumbList should match the visible breadcrumb.

Every structured data entity must use:

- correct canonical URL
- stable IDs where useful
- valid URLs
- valid image references
- correct author/publisher relationships

Use @id relationships where it meaningfully helps connect entities.

Run validation against current Google-supported structured data rules.

Remove invalid, contradictory or duplicate schema.

==================================================
TASK 5 — GEO / AI SEARCH READINESS
==================================================

Do not create fake "GEO hacks."

Improve machine-readable structure and content clarity.

For important topic/concept pages ensure the architecture supports sections such as:

- what the concept is
- who it is suitable for
- colors
- themes
- decoration
- cake
- gifts
- shopping checklist
- budget
- venue
- preparation steps
- related ideas
- real user experiences
- questions
- related concepts

Do not generate filler text.

Make sure semantic headings are correct:

H1
H2
H3

and information is accessible in server HTML.

Where applicable ensure entities connect naturally through internal links.

Example:

Doğum Günü
→ 1 Yaş
→ Kız
→ Ayıcık
→ Concept
→ Experience
→ Question

This should be a logical content graph, not a flat tag farm.

==================================================
TASK 6 — MULTILINGUAL /EN READINESS
==================================================

Do NOT publish English content now unless it already exists.

Prepare the architecture so /en/ can be introduced later safely.

Desired future architecture:

/tr/...
/en/...

Examples:

/tr/dogum-gunu/
/en/birthday/

Turkish pages must remain self-canonical.

Future English pages must also be self-canonical.

NEVER canonical Turkish pages to English or vice versa.

Prepare reusable hreflang infrastructure capable of outputting:

tr
en
x-default

ONLY when equivalent translated/localized pages exist.

Do not output invalid hreflang references to pages that do not exist yet.

Language routing must not depend only on browser JavaScript.

Avoid forced redirects based solely on IP or browser language.

==================================================
TASK 7 — SITEMAP VALIDATION
==================================================

Inspect all sitemap generators.

Rules:

Include only canonical, indexable URLs.

Do not include:

- noindex pages
- search result pages
- arbitrary filter combinations
- pagination unless there is a deliberate reason
- redirects
- 404
- duplicate canonical variants

Verify all sitemap URLs return HTTP 200.

Verify:

sitemap URL
=
canonical URL

where appropriate.

Make sure new topic /konu/ pages are included correctly.

If the site scales significantly, ensure sitemap splitting is designed cleanly by content type.

Possible examples:

sitemap-pages.xml
sitemap-concepts.xml
sitemap-topics.xml
sitemap-experiences.xml
sitemap-questions.xml
sitemap-profiles.xml

Do not create unnecessary sitemap complexity now if scale does not require it.

==================================================
TASK 8 — ROBOTS / CRAWL CONTROL
==================================================

Audit:

robots.txt

meta robots

X-Robots-Tag if used

canonical

sitemap

for contradictions.

Important:

Do NOT robots.txt block pages that Google must crawl in order to see:

noindex

or

canonical

unless there is a deliberate technical reason.

Search pages and utility endpoints may be controlled appropriately.

Do not block CSS/JS assets required for rendering.

==================================================
TASK 9 — IMAGE SEO + PINTEREST + DISCOVER READINESS
==================================================

Konsepthane is highly visual.

Audit image delivery.

For editorial/concept/UGC images ensure:

- descriptive filename where possible
- meaningful alt text
- width and height attributes
- responsive srcset/sizes
- modern optimized formats
- lazy loading below the fold
- hero/LCP image is NOT incorrectly lazy-loaded
- correct preload / fetchpriority where appropriate
- stable aspect ratio
- no layout shift
- large high-quality social preview images

Ensure Open Graph metadata exists:

og:title
og:description
og:image
og:url

and relevant Twitter card metadata.

The platform will receive significant traffic from Pinterest.

Ensure article/concept detail pages have clean shareable images and metadata.

Do not stuff keywords into ALT attributes.

==================================================
TASK 10 — CORE WEB VITALS
==================================================

Audit representative pages for:

LCP
INP
CLS

and general performance.

Inspect:

- font loading
- image sizing
- lazy loading
- hydration
- unnecessary client JS
- third-party scripts
- analytics
- layout shifts
- blocking CSS
- preloads
- large bundle sizes

SEO-critical pages should prioritize server-rendered content and minimal unnecessary JavaScript.

Do not compromise usability merely to chase Lighthouse 100.

Fix real performance bottlenecks.

==================================================
TASK 11 — INTERNAL LINKING SAFETY
==================================================

Current internal linking is healthy.

Preserve:

- real <a href>
- breadcrumbs
- category → topic
- topic → detail
- detail → related detail
- semantic anchor text

Do not replace crawlable links with JS navigation.

Inspect whether home page link count grows uncontrollably as content scales.

Homepage should link primarily to:

- primary categories
- high-value hubs
- featured/trending concepts
- curated content

Do NOT attempt to expose every page directly from homepage.

Maintain hierarchy:

Homepage
→ Pillar
→ Cluster
→ Detail

==================================================
TASK 12 — PAGINATION
==================================================

Current pagination is reported healthy.

DO NOT redesign it unless a real defect exists.

Preserve:

- unique paginated URLs
- crawlable <a href>
- self canonical
- index, follow where appropriate
- 404 on impossible page numbers

Note:

rel=next / rel=prev may remain for compatibility but Google does not depend on them.

Do not canonicalize every pagination page to page 1.

==================================================
TASK 13 — BUILD AN AUTOMATED SEO AUDIT COMMAND
==================================================

There is already a link audit script called something similar to:

linkaudit.mjs

Inspect and improve it if useful.

Create one repeatable command for pre-deployment SEO validation.

Example concept:

npm run seo:audit

It should report at minimum:

- broken internal links
- orphan indexable URLs
- empty anchors
- links without href
- redirect chains
- sitemap/indexability mismatch
- sitemap non-200 URLs
- canonical mismatch
- canonical pointing to redirects/404
- noindex URLs appearing in sitemap
- indexable pages absent from sitemap where required
- conflicting robots/canonical
- duplicate canonicals
- duplicate titles if possible
- missing titles
- missing H1
- multiple H1 where inappropriate
- hreflang problems when multilingual pages exist

The command should exit with non-zero status for critical failures.

It should be usable in CI/CD later.

==================================================
TASK 14 — DO NOT DAMAGE CURRENT SEO
==================================================

Before editing:

1. inspect current implementation
2. identify the exact files involved
3. create a short written audit
4. distinguish:

CRITICAL
IMPORTANT
OPTIONAL
ALREADY CORRECT

Then make changes only for CRITICAL and IMPORTANT items.

Do not modify ALREADY CORRECT behavior.

After edits:

run:

- build
- tests
- lint
- SEO audit
- production-like crawl

Then compare BEFORE vs AFTER.

There must be no regression in:

- crawlable page count unexpectedly
- orphan URLs
- internal broken links
- sitemap
- canonical
- robots
- pagination
- structured data
- server rendering

==================================================
FINAL DELIVERABLE
==================================================

When finished, give me a report in Turkish with:

1. Bulunan sorunlar
2. Yapılan değişiklikler
3. Değiştirilmeyen ve zaten doğru çalışan alanlar
4. SEO açısından kalan riskler
5. GEO/AI Search açısından kalan işler
6. Structured data matrix
7. Sitemap/indexability rules
8. Faceted navigation rules
9. Multilingual /en preparation status
10. Core Web Vitals findings
11. Before/after crawl results
12. Files changed
13. Commands/tests run
14. Any items requiring Search Console monitoring

Do NOT simply tell me everything is fine.

Verify the code and runtime behavior.

Most importantly:

DO NOT over-engineer.
DO NOT blindly generate SEO pages.
DO NOT produce thin programmatic pages.
DO NOT break the current healthy crawl architecture.

The goal is:

A technically clean, crawl-efficient, scalable, multilingual-ready, UGC-ready SEO/GEO architecture for Konsepthane.net.