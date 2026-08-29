# CLAUDE_HANDOFF.md

> **Read this file before making any changes.**
>
> You are taking over an existing project that was previously developed with Codex.
> **Do not rebuild the project from scratch. Do not discard working infrastructure or domain work.**
>
> Your first responsibility is to inspect the repository, understand what already exists, compare it with the product direction in this document, identify unfinished work, and then continue from the current state.

---

# 1. Project Summary

We are building a Turkish **event inspiration, editorial content, UGC, experience-sharing, Q&A and planning platform**.

The product is primarily for people looking for ideas around:

- birthdays
- children's birthdays
- first birthdays
- birthday themes
- baby shower
- gender reveal
- engagement / nişan
- söz
- kına
- bridal events
- bachelorette parties
- newborn celebrations
- diş buğdayı
- mevlüt
- party decoration
- balloon decoration
- table decoration
- cakes
- event preparation
- celebration inspiration

The long-term ambition is to become a major Turkish discovery platform for:

> **"Özel günümü nasıl hazırlamalıyım?"**

The platform must **not** feel like a traditional forum, ecommerce site, Reddit clone or generic blog.

The correct product identity is:

> **A modern editorial / blog-style visual inspiration platform with a strong contextual community layer.**

---

# 2. Core Product Philosophy

The current product hierarchy is:

```text
EDITORIAL / CONCEPT CONTENT
        ↓
VISUAL INSPIRATION
        ↓
REAL USER EXPERIENCES
        ↓
QUESTIONS & ANSWERS
        ↓
COMMENTS / DISCUSSION
        ↓
SAVES / COLLECTIONS
```

Not:

```text
FORUM FEED
    ↓
everything else
```

The first thing a visitor should think is:

> **"Burada kutlamam için fikir bulabilirim."**

After entering a concept/article they should discover:

> **"Bu konsepti gerçek insanların nasıl yaptığını görebiliyorum."**

Then:

> **"Bu fikir hakkında soru sorabiliyorum ve insanlarla konuşabiliyorum."**

---

# 3. Product Inspiration

Use the following only as **conceptual product/UX references**.

Do not copy code, visual layouts, branding, images or copyrighted content.

## NefisYemekTarifleri

https://www.nefisyemektarifleri.com/

Most important analogy:

```text
Recipe
→ user reads
→ user makes recipe
→ user shares result
→ asks questions
→ comments
→ saves
```

Our equivalent:

```text
Concept
→ user gets inspiration
→ user organizes event
→ user uploads visual Experience
→ asks questions
→ comments
→ saves
```

The important concept is that the primary editorial object remains valuable on its own, while the community makes it richer.

## Allrecipes

Reference for:

- strong primary content object
- real user results
- comments/reviews
- users adapting content
- community existing under editorial content

## Catch My Party

Reference for:

- visual party discovery
- real parties uploaded by users
- long-tail UGC
- visual event experiences
- "browse ideas + share what you did"

This is one of the closest functional references to our long-term product.

## Houzz

Reference for:

- inspiration first
- community second
- saving ideas
- ideabook / collection planning
- Q&A around ideas
- real user implementations
- discussions without making the entire site a forum

## The Knot

Reference for:

- editorial content hierarchy
- Ideas & Advice
- premium inspiration presentation
- future style/concept planning experiences

## Pinterest

Reference for:

- visual discovery
- save behavior
- collections / planning boards
- visual hierarchy

Do not build a Pinterest clone.

## Letterboxd

Reference for a useful architectural principle:

> The domain object remains primary while social interactions surround it.

For us:

> Concept remains primary while saves, questions, profiles, comments and collections surround it.

---

# 4. Critical UI/UX Correction

A previous implementation became **too forum-like**.

That direction is incorrect.

Do not design the homepage as:

- a chronological question feed
- endless discussion cards
- Reddit
- phpBB
- a permanent giant forum sidebar
- text-first community feed

Community features should remain implemented, but their **presentation must be contextual**.

The public site should visually feel closer to:

```text
modern lifestyle editorial site
+
visual inspiration platform
+
UGC experiences
+
contextual community
```

---

# 5. Primary Content Type: Concept / Editorial Article

The primary SEO and discovery object is a structured concept/article.

Example:

> **1 Yaş Ayıcık Temalı Doğum Günü Konsepti**

A concept page should support meaningful editorial sections such as:

- title
- intro
- hero visual
- image gallery
- theme
- event type
- age
- color palette
- style
- venue type
- concept explanation
- table setup
- balloon ideas
- backdrop/background
- cake inspiration
- decoration details
- practical advice
- alternatives
- tips
- FAQ
- author
- publish/update dates
- related concepts
- SEO metadata

The article itself must be valuable even with zero community activity.

---

# 6. The Signature Community Interaction

Under a Concept/Guide, a user should not see only a generic comment box.

Ask:

> **"Ne paylaşmak istiyorsun?"**

Options:

```text
Yorum
Soru Sor
Deneyimini Paylaş
```

These are semantically different.

---

# 7. Comment / Yorum

Simple reaction or opinion.

Example:

> "Renk uyumu çok güzel olmuş."

Capabilities may include:

- body
- author
- timestamp
- replies
- like/helpful
- report
- moderation

Badge:

> **Yorum**

A comment is not the same as a Question or Experience.

---

# 8. Question / Soru

Question means:

> **"Yardıma ihtiyacım var."**

Example:

> "Bu ayıcık konsepti 20 m² salonda kalabalık görünür mü?"

A Question is a **first-class entity**, not just Comment.type = QUESTION.

Possible capabilities:

- title
- body
- optional images
- concept relation nullable
- topic relations
- answers
- accepted answer where appropriate
- helpful votes
- status
- followers
- views
- moderation

Questions can be contextual to an article:

```text
Question
→ related Concept
```

Standalone Questions must also be supported.

Questions may include images.

---

# 9. Experience / Deneyim

Experience means:

> **"Ben bunu gerçekten yaptım."**

This is one of the most important product features.

An Experience must be a **first-class domain entity**.

Do not store rich experiences merely as comments.

Example:

> "Kızımın 1 Yaş Ayıcık Doğum Gününü Evde Yaptık"

At least **one image must be required** for an Experience.

Prefer multiple images.

Possible fields:

- id
- author
- related concept nullable
- event type
- title
- body
- images
- age nullable
- theme
- colors
- city optional
- venue optional
- guest count optional
- budget range optional
- tips
- what worked
- what I would change
- moderation status
- visibility
- indexability state
- createdAt
- updatedAt

Experience should appear:

- under the related Concept
- on `/deneyimler`
- on the author's profile
- in search
- in selected homepage modules

Experience should support:

- comments
- likes
- saves
- reporting
- moderation

---

# 10. Concept → Experience Relationship

This relationship is central.

Example:

```text
Concept:
1 Yaş Ayıcık Temalı Doğum Günü

Experience:
"Biz krem ve kahve tonlarında yaptık."
```

The Concept page should show:

> **"Bu konsepti deneyenler"**

CTA:

> **"Bu konsepti yaptın mı? Deneyimini paylaş."**

If the user starts Experience creation from a Concept, `conceptId` should already be known.

This is our event-platform equivalent of users sharing photos after trying a recipe.

---

# 11. Concept Detail Page Target Hierarchy

A Concept page should approximately feel like:

```text
Breadcrumb

Title
Intro
Author / Date

Save
Share

Large Hero Image
Gallery

--------------------------------

EDITORIAL ARTICLE

Concept explanation
Colors
Table
Decorations
Balloons
Backdrop
Cake
Tips
FAQ
etc.

--------------------------------

BU KONSEPTİ DENEYENLER

Visual Experience cards

[Deneyimini Paylaş]

--------------------------------

BU KONSEPT HAKKINDA SORULAR

Contextual questions

[Soru Sor]

--------------------------------

YORUMLAR

Normal comments

[Ne paylaşmak istiyorsun?]
[Yorum] [Soru] [Deneyim]

--------------------------------

RELATED CONCEPTS
```

Community should make the article feel alive without turning the article into a forum thread.

---

# 12. Homepage Target

The homepage must be **editorial/discovery first**.

Approximate hierarchy:

```text
HEADER

COMPACT SEARCH / DISCOVERY HERO

VISUAL CATEGORIES

EDITOR'S PICKS / FEATURED CONCEPTS

FİKİRLERİ KEŞFET

REAL USER EXPERIENCES

COMMUNITY QUESTIONS

POPULAR COLLECTIONS

GUIDES

FOOTER
```

Do not overfill the page.

---

# 13. Header

Preferred public navigation direction:

```text
Logo

Doğum Günü
Baby Shower
Nişan
Söz & Kına
Fikirler
Deneyimler
Sorular

Search
Kaydedilenler
Profile
+ Paylaş
```

Do not make `Sorular / Tartışmalar` more visually dominant than inspiration categories.

---

# 14. Compact Hero

Do not use a huge SaaS landing-page hero.

Example:

> **Kutlaman için ilham bul.**

Main search example:

> **"Nasıl bir konsept arıyorsun?"**

Possible chips:

- 1 Yaş
- 2 Yaş
- 3 Yaş
- Kız Çocuk
- Erkek Çocuk
- Safari
- Ayıcık
- Minimal
- Evde
- Pastalar
- Balon & Süsleme

---

# 15. Visual Categories

Use visual cards, not only text.

Initial focus examples:

- 1 Yaş Doğum Günü
- Kız Çocuk
- Erkek Çocuk
- Evde Kutlama
- Safari
- Ayıcık
- Minimal
- Pastalar
- Masa Süsleme
- Balon & Dekorasyon

Images should dominate.

---

# 16. Main Idea Discovery

Section:

> **Fikirleri keşfet**

Possible tabs:

- Popüler
- Yeni
- En çok kaydedilen

Use responsive editorial grid / masonry where appropriate.

Example card:

```text
[LARGE IMAGE]

Ayıcık Temalı 1 Yaş Doğum Günü

1 Yaş · Ayıcık · Bej

18 kişi denedi
7 soru
412 kaydetme

[Save]
```

Do not put forum badges on Concept cards.

---

# 17. Real Experiences Homepage Module

Section examples:

> **Gerçek insanlar nasıl yapmış?**

or:

> **Siz nasıl yaptınız?**

Visual UGC is important.

---

# 18. Questions Homepage Module

Questions should exist on the homepage, but in a **compact dedicated module**.

Example:

> **Topluluğa danış**

The homepage should not become a Question feed.

---

# 19. `/deneyimler`

This is a visual UGC area.

It must **not** look like a forum.

Use:

- strong imagery
- masonry / responsive grids
- filters
- visual cards

---

# 20. `/sorular`

This page may be more Q&A-like.

Possible tabs:

- Popüler
- Yeni
- Cevapsız
- Takip ettiklerim

Question cards may be text-heavy here.

This is the correct place for stronger community/forum characteristics.

Do not transfer that visual language to the homepage.

---

# 21. Collections

Collections are a major retention/planning feature.

Example:

> **Defne'nin 1 Yaş Doğum Günü**

A collection should feel like a **planning board / moodboard**, not a forum list.

Possible content:

- Concepts
- Guides
- Experiences
- Questions

Primary planning focus should be Concepts.

Possible privacy:

- public
- unlisted
- private

Visual collage/cover is preferred.

---

# 22. Saves vs Likes

These should remain different.

## Like

Lightweight public engagement.

## Save

Private/planning intent.

Users save content into:

- Saved
- Collections

This distinction is important for later personalization and planning workflows.

---

# 23. Profiles

Community-oriented but content-first.

Possible tabs:

- Paylaşımlarım
- Deneyimlerim
- Sorularım
- Cevaplarım
- Koleksiyonlarım

Experience grid should be visual.

---

# 24. Create / Share Flow

Primary public CTA:

> **+ Paylaş**

Suggested options:

```text
Fikir / İçerik Paylaş
Deneyimini Paylaş
Soru Sor
Tartışma Başlat
```

Do not make Discussion the primary/default action.

Experience and Question flows should have dedicated forms.

---

# 25. Initial Content Vertical

The platform architecture remains multi-category.

However, initial SEO and product depth should prioritize:

> **BIRTHDAY / DOĞUM GÜNÜ**

Especially:

- 1 year old
- 2 years old
- 3 years old
- 4 years old
- 5 years old
- girl themes
- boy themes
- gender-neutral themes
- home birthday
- birthday decorations
- cakes
- tables
- balloons

Do not remove existing taxonomy for other event types.

---

# 26. SEO

SEO is a first-class requirement.

Primary indexable assets:

- Concept
- Guide
- curated SEO landing pages

Questions may become indexable when quality thresholds are met.

Experiences may become independently indexable only if:

- public
- approved
- unique
- sufficiently rich
- useful

Do not automatically index thin UGC.

Private collections are never indexable.

SEO landing pages should remain editorial/discovery pages, not forum indexes.

---

# 27. Search

Meilisearch already exists.

Search should eventually support:

- Concepts
- Guides
- Experiences
- Questions
- Topics
- users where appropriate

Filters may include:

- content type
- event type
- age
- theme
- color
- venue
- popularity
- recency

Keep typo tolerance and Turkish language behavior in mind.

---

# 28. Moderation

UGC moderation is important.

Preserve/refine:

- ContentReport
- CommentReport
- UserReport
- ModerationCase
- ModerationNote
- ModerationAction
- bans/mutes if already supported
- visibility controls
- media takedown

Report reasons may include:

- spam
- harassment
- copyright
- privacy
- inappropriate content
- misinformation
- other

Experience images require strong moderation.

---

# 29. Media Rights / Privacy

Users may upload:

- children
- family
- guests
- professional photography

The technical platform should support:

- media ownership declaration
- privacy confirmation
- reporting
- copyright complaint
- privacy complaint
- takedown request
- admin media removal
- audit history

Do not write final legal policy text without legal review.

Build technical capability only.

---

# 30. Existing / Expected Technical Stack

Inspect the repository and confirm what actually exists.

The intended architecture from previous milestones was:

## Monorepo

- pnpm workspaces
- Turborepo

## Apps

- `apps/web`
- `apps/admin`
- `apps/api`
- `apps/worker`

## Frontend

- Next.js
- TypeScript
- React
- Tailwind CSS

## Admin

Separate Next.js application.

## API

- NestJS
- modular monolith

## Database

- PostgreSQL
- Prisma

## Cache

- Redis

## Queue

- BullMQ

## Search

- Meilisearch

## Object storage

- MinIO locally
- S3-compatible abstraction

## Local email

- Mailpit

## Proxy

Nginx currently exists in the running environment.

**Do not assume every architectural intention was completed. Inspect the repository.**

---

# 31. Verified Local Addresses

These were confirmed working during the previous development phase:

- Public site: http://localhost:3200
- Admin: http://localhost:3201/admin/giris
- Nginx public site: http://localhost:8180
- API: http://localhost:4000
- Mailpit: http://localhost:8025
- MinIO: http://localhost:9001
- Meilisearch: http://localhost:7700

The stack was Dockerized.

Preserve this developer experience unless the repository proves otherwise.

---

# 32. Future Phase: AI Concept Planner

This is **not the current implementation priority**.

However, architecture must remain extensible.

Future feature:

> **"Hayalindeki konsepti oluşturalım."**

User may enter:

- event type
- age
- gender target where relevant
- venue
- guest count
- style
- colors
- theme
- budget
- free-text wishes

Example:

```text
1 yaş erkek çocuk
evde
20 kişi
minimal
bej + kahve
ayıcık teması
çok kalabalık görünmesin
```

Future system may generate:

- concept description
- color palette
- table idea
- background
- balloons
- cake direction
- preparation checklist
- related Concepts
- related Experiences
- related Questions
- generated visual concept

Prefer provider abstraction such as:

```text
ConceptGenerationProvider
```

Do not tightly couple the domain to one AI vendor.

Possible future persistence:

- ConceptPlannerSession
- ConceptPlannerInput
- ConceptPlannerPreference
- ConceptPlannerResult

Do not implement a large AI subsystem now unless already partially implemented and explicitly required.

---

# 33. Future Phase: Shoppable Concept Images

Also **not a current UI priority**.

Long-term vision:

AI or editorial concept image may contain subtle interactive product hotspots.

Example:

```text
Generated Concept Image
    ↓
user taps balloon hotspot
    ↓
product preview
    ↓
similar/exact product
    ↓
Trendyol / Amazon / another merchant
```

Commerce should remain **optional and decoupled** from content.

Potential relationship:

```text
Concept
→ ConceptMedia
→ MediaHotspot
→ ProductReference
→ MerchantOffer
```

## Hotspot coordinates

Use normalized coordinates:

```text
x = 0.0 - 1.0
y = 0.0 - 1.0
```

Do not use raw pixels as canonical coordinates.

## Product match types

Future system must distinguish:

- EXACT
- SIMILAR
- AI_SUGGESTED
- EDITOR_SELECTED

Never imply an AI-generated item is the exact purchasable item unless verified.

Possible provider abstractions:

- CommerceProvider
- MerchantCatalogProvider
- AffiliateLinkProvider

Do not make the current Concept/community domain depend on commerce.

---

# 34. Future Feature Flags

Where feature flags exist, future commerce/AI features should remain disabled for now.

Conceptually:

```text
commerce_enabled = false
affiliate_enabled = false
shoppable_images_enabled = false
ai_concept_planner_enabled = false
```

Current product priority is still:

```text
Concept
→ Experience
→ Question
→ Answer
→ Comment
→ Save
→ Collection
```

---

# 35. UI Visual Direction

Desired:

- modern
- editorial
- premium
- warm
- friendly
- visual
- clean
- soft
- contemporary
- not childish
- not stereotypically feminine

Possible design direction:

- warm white
- cream
- stone
- soft beige
- charcoal
- muted rose accent
- sage accent
- subtle lavender accent

Use design tokens.

Avoid:

- giant forum sidebar
- Reddit-like homepage
- phpBB layouts
- endless white text cards
- generic SaaS dashboard style
- Bootstrap-looking public UI
- huge marketing hero
- excessive gradients
- excessive pills
- everything pink
- childish decorative UI

Images should have strong visual hierarchy.

---

# 36. Mobile UX

Mobile is critical.

Possible bottom navigation:

```text
Ana Sayfa
Keşfet
Paylaş
Kaydedilenler
Profil
```

Requirements:

- comfortable touch targets
- easy Save
- easy photo viewing/swiping
- simple Experience creation
- simple Question creation
- no desktop sidebars copied to mobile
- performant image loading

---

# 37. Performance

SEO and Core Web Vitals matter.

Avoid:

- loading hundreds of posts
- giant client bundles
- unnecessary client components
- huge hydration payloads
- unoptimized media
- expensive counts on every request

Use existing stack appropriately.

Do not over-engineer.

---

# 38. Cold Start

The product is UGC-enabled, but it must not look empty.

Do not create fake users, fake reviews or fake community activity.

Development seed data can exist but must clearly be sample/dev data.

The admin should be capable of:

- editorial seed content
- featured content
- featured topics
- curated collections
- featured Experiences
- homepage curation

Real launch content should come from real/editorial contributors and approved users.

---

# 39. Sample Content Direction

Seed/sample content should be weighted toward inspiration rather than discussions.

Approximate homepage visual balance:

- 50–60% Concepts / Guides / Inspiration
- 20–30% Experiences
- 10–20% Questions/community modules

This is visual guidance, not a database constraint.

Examples:

## Concept

- 1 Yaş Ayıcık Temalı Doğum Günü
- 3 Yaş Safari Doğum Günü
- Minimal Bej Evde Doğum Günü

## Guide

- Evde Doğum Günü İçin 20 Hazırlık Fikri

## Experience

- Kızımın 1 Yaş Ayıcık Doğum Gününü Evde Yaptık

## Question

- Bu ayıcık konsepti 20 kişilik salonda kalabalık görünür mü?

## Visual Question

- Safari mi Teddy Bear mı?

## Collection

- Defne'nin 1 Yaş Doğum Günü

---

# 40. Admin Expectations

The admin application is a first-class product.

Depending on what already exists, it should eventually manage:

- users
- roles / permissions
- concepts
- guides
- categories / taxonomy
- Experiences
- Questions
- Answers
- Comments
- Topics
- Collections where moderation is required
- moderation queue
- reports
- media
- featured content
- homepage curation
- SEO indexability
- redirects
- settings
- feature flags

Do not rebuild admin blindly.

Inspect current implementation and extend only where needed.

---

# 41. Important Domain Principle

Do **not** collapse everything into one generic Post model unless the current architecture already has an abstraction that preserves domain semantics cleanly.

Semantic differences matter:

```text
Concept     = editorial inspiration
Guide       = editorial educational content
Question    = user needs help
Experience  = user actually did it
Comment     = lightweight contextual reaction
Collection  = planning/save container
```

These relationships drive UI, SEO, moderation, search, analytics and future phases.

---

# 42. Immediate Takeover Procedure

Before changing code:

## Step 1 — Inspect repository

Inspect:

- git status
- recent commits if available
- existing docs
- package structure
- Docker Compose
- environment files
- apps
- shared packages
- Prisma schema
- migrations
- seed data
- API modules
- frontend routes
- admin routes
- UI package
- existing design tokens
- current homepage
- Concept detail
- `/deneyimler`
- `/sorular`
- Collections
- profiles
- auth
- moderation
- search

## Step 2 — Determine exactly where Codex stopped

Do not assume the last prompt was fully completed.

Check:

- modified/uncommitted files
- TODOs
- broken tests
- incomplete routes
- placeholder components
- partially completed migrations
- unfinished docs
- build failures

## Step 3 — Run baseline quality checks

Before major refactoring, record current state.

Run the project's actual equivalents of:

```bash
lint
typecheck
tests
build
```

Also validate Docker services if practical.

Document failures that existed before your changes.

## Step 4 — Compare implementation against this handoff

Create/update:

```text
docs/HANDOFF_AUDIT.md
```

Include:

- already complete
- partially complete
- missing
- incorrect product/UI direction
- technical debt
- recommended continuation order

## Step 5 — Continue, do not restart

Preserve good existing work.

Refactor only what conflicts with the clarified product direction.

---

# 43. Current Highest-Priority Work

If Codex did not finish the last redesign milestone, prioritize:

1. Audit current implementation.
2. Correct homepage information hierarchy.
3. Ensure Concept/Guide is the primary public content object.
4. Refine Concept detail page into strong editorial layout.
5. Ensure Experience is first-class and image-required.
6. Integrate Experiences under related Concepts.
7. Implement/refine contextual contribution selector:
   - Yorum
   - Soru
   - Deneyim
8. Ensure Questions can link to a Concept but also exist standalone.
9. Make `/deneyimler` visual-first.
10. Keep `/sorular` Q&A-like without infecting the homepage design.
11. Refine collections into visual planning boards.
12. Refine mobile UX.
13. Rebalance sample data toward Concepts/Experiences.
14. Update admin for any new moderation/content relations.
15. Update SEO indexability logic if necessary.
16. Run full quality checks.
17. Keep all current local services operational.

---

# 44. Acceptance Criteria

## Homepage

When opening:

http://localhost:3200

The first impression must be:

> **"Beautiful event inspiration/editorial platform."**

It must NOT feel like:

- forum
- Reddit
- corporate SaaS landing page
- ecommerce shop
- empty starter template

## Concept page

When opening a concept like:

> **1 Yaş Ayıcık Temalı Doğum Günü**

The user must first experience a high-quality editorial article.

Then:

> **Bu konsepti deneyenler**

Then:

> **Bu konsept hakkında sorular**

Then:

> **Yorumlar**

Community lives around the article.

## Experience

A user can say:

> "Ben bunu yaptım."

They must upload at least one visual.

The Experience appears:

- under the related Concept
- `/deneyimler`
- their profile

and can receive engagement.

## Question

A user can ask:

> "Bu iki konseptten hangisi?"

with optional images.

The Question can be standalone or contextual to a Concept.

## Collection

A Collection visually feels like:

> a planning board / moodboard

not a thread list.

---

# 45. Do Not Do Now

Unless already partly implemented and required to finish a safe refactor, do not prioritize:

- checkout
- marketplace payments
- vendor subscriptions
- full affiliate integrations
- product catalog scraping
- AI visual search
- vector DB / Pinecone
- complex recommender ML
- real-time chat
- complex gamification economy
- native mobile apps

These are future phases.

---

# 46. Documentation to Keep Current

Inspect and update relevant existing docs.

Expected docs from earlier phases may include:

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/DOMAIN_MODEL.md`
- `docs/SEO.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/COMMUNITY.md`
- `docs/UI_UX.md`
- `docs/MODERATION.md`
- `docs/CONTENT_TYPES.md`

Do not create duplicate documents if equivalent docs already exist.

Add:

```text
docs/HANDOFF_AUDIT.md
```

for the Claude takeover audit.

---

# 47. Final Rule for Claude

Do not ask for permission for routine engineering decisions.

Use the repository as the source of truth for what is currently implemented.

Ask only if a decision materially changes:

- product scope
- business model
- user privacy
- architecture direction
- destructive migration strategy

For ordinary implementation work:

```text
inspect → decide → document → implement → test
```

At the end of each substantial milestone report:

- what existed before
- what you changed
- schema/migrations
- routes/components
- UI/UX changes
- tests run
- URLs verified
- known limitations
- next recommended milestone

---

# 48. First Instruction

**Start now by auditing the current repository.**

Do not create a fresh app.

Do not delete the existing stack.

Determine exactly where Codex stopped.

Then continue the unfinished milestone using the clarified product direction in this file.

The highest priority is to make the product feel like:

> **Editorial inspiration first, visual real-user experiences second, contextual community third, commerce later.**
