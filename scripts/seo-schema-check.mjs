#!/usr/bin/env node
/**
 * Structured-data sanity check against Google's documented requirements for the types the site
 * emits. Not a replacement for the Rich Results Test — it catches the mechanical mistakes (missing
 * required properties, relative URLs, broken @id links, duplicate site-identity entities) before
 * deployment.
 *
 *   pnpm seo:schema                      # default representative pages on http://localhost:3200
 *   SEO_AUDIT_BASE=https://konsepthane.net node scripts/seo-schema-check.mjs /tr /tr/konsept/x
 */
const base = (process.env.SEO_AUDIT_BASE ?? 'http://localhost:3200').replace(/\/$/, '');
const paths = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      '/tr',
      '/tr/kategori/dogum-gunu',
      '/tr/kategori/dogum-gunu/ayicik',
      '/tr/konu',
      '/tr/konu/ayicik',
      '/tr/konsept/1-yas-ayicik-temali-dogum-gunu-konsepti',
      '/tr/rehber/evde-dogum-gunu-icin-48-saatlik-hazirlik-plani',
      '/tr/deneyim/evde-1-yas-ayicik-dogum-gunu-deneyimimiz',
      '/tr/soru/ayicik-konsepti-icin-arka-fon-kac-metre-olmali',
      '/tr/tartisma/cocuk-partilerinde-hediye-poseti-gerekli-mi',
      '/tr/koleksiyon/evde-kutlama-ornek-secimim',
      '/tr/hakkimizda',
    ];

const isAbs = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const required = {
  Organization: ['name', 'url', 'logo'],
  WebSite: ['url', 'name'],
  BreadcrumbList: ['itemListElement'],
  ItemList: ['itemListElement'],
  Article: ['headline', 'datePublished', 'author', 'publisher', 'mainEntityOfPage'],
  QAPage: ['mainEntity'],
  Question: ['name', 'text', 'answerCount'],
  Answer: ['text'],
  DiscussionForumPosting: ['headline', 'author', 'datePublished'],
  Person: ['name'],
  ImageObject: ['url'],
  ProfilePage: ['mainEntity'],
};
// Author policy (docs/AUTHORS.md): editorial Article.author is either a real editor Person that
// links to its ProfilePage entity (`/editor/<slug>#person`) or the publisher Organization by @id.
// Never a Person that is not a real, public editor.
const authorChecks = [];
let problems = 0;
const report = (path, msg) => {
  problems += 1;
  console.log(`  ✗ ${path}: ${msg}`);
};
const info = (path, msg) => console.log(`  · ${path}: ${msg}`);
function walk(node, path, ctx, depth = 0) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, path, ctx, depth));
  const type = node['@type'];
  if (type) {
    ctx.types.push(type);
    const req = required[type] ?? [];
    for (const key of req)
      if (node[key] === undefined || node[key] === null || node[key] === '')
        report(path, `${type} missing "${key}"`);
    for (const key of ['url', 'image', 'logo', 'mainEntityOfPage', 'item']) {
      const value = node[key];
      const urls = Array.isArray(value) ? value : value ? [value] : [];
      for (const u of urls) {
        const s = typeof u === 'string' ? u : (u?.url ?? u?.['@id']);
        if (s && !isAbs(s)) report(path, `${type}.${key} is not absolute: ${s}`);
      }
    }
    if (node['@id']) ctx.ids.add(node['@id']);
    // Article.image is recommended, not required; a missing image is reported as information so
    // nobody "fixes" it with a generic logo (policy: only images that depict the content).
    if (type === 'Article' && !node.image)
      info(path, 'Article without image (recommended, not required)');
    if (type === 'Article' && node.image) {
      const images = Array.isArray(node.image) ? node.image : [node.image];
      for (const img of images) {
        const src = typeof img === 'string' ? img : img?.url;
        if (src && /opengraph-image|konsepthane-mark|konsepthane-social/.test(src))
          report(
            path,
            `Article.image is a generic brand image (${src}) — use a content image or omit`,
          );
      }
    }
    if (type === 'Article' || type === 'DiscussionForumPosting') {
      const author = node.author;
      if (!author || typeof author !== 'object') report(path, `${type}.author missing`);
      else if (author['@type'] === 'Person') {
        if (!author.name) report(path, `${type}.author Person without name`);
        if (author.url && !isAbs(author.url)) report(path, `${type}.author.url not absolute`);
        if (author['@id'] && !/#person$/.test(author['@id']))
          report(path, `${type}.author.@id should end with #person (${author['@id']})`);
        if (/^konsepthane$/i.test(author.name ?? ''))
          report(path, 'brand name used as a Person author');
        // Editorial content (concept/guide) must point at a real editor profile page.
        if (/\/(konsept|rehber)\//.test(path)) {
          if (!author.url || !/\/editor\//.test(author.url))
            report(path, `editorial ${type}.author Person must link to an /editor/ profile`);
          else authorChecks.push({ path, url: author.url, id: author['@id'] });
        }
      } else if (author['@type'] === 'Organization' || (!author['@type'] && author['@id'])) {
        if (!author['@id'] && !author.name)
          report(path, `${type}.author Organization without @id/name`);
        if (author['@id']) ctx.refs.add(author['@id']);
      } else report(path, `${type}.author has unexpected @type ${author['@type']}`);
    }
    if (type === 'ProfilePage') {
      const person = node.mainEntity;
      const canonical = ctx.canonical;
      if (!person || person['@type'] !== 'Person')
        report(path, 'ProfilePage.mainEntity must be a Person');
      else {
        if (!person['@id'] || (canonical && person['@id'] !== `${canonical}#person`))
          report(path, `ProfilePage.mainEntity.@id must equal canonical#person (${person['@id']})`);
        if (!person.name) report(path, 'ProfilePage Person without name');
        for (const u of person.sameAs ?? [])
          if (!isAbs(u)) report(path, `Person.sameAs not absolute: ${u}`);
      }
      if (!/\/editor\//.test(path))
        report(path, 'ProfilePage emitted outside /editor/ (members are noindex, no ProfilePage)');
    }
    if (type === 'Article' && node.headline && node.headline.length > 110)
      report(path, `Article.headline > 110 chars (${node.headline.length})`);
    if (type === 'BreadcrumbList') {
      const items = node.itemListElement ?? [];
      items.forEach((it, i) => {
        if (it.position !== i + 1)
          report(path, `BreadcrumbList position ${it.position} at index ${i}`);
        if (!it.name) report(path, 'BreadcrumbList item without name');
      });
    }
    if (type === 'QAPage') {
      const q = node.mainEntity;
      if (!q || q['@type'] !== 'Question') report(path, 'QAPage.mainEntity must be a Question');
      else if (!q.acceptedAnswer && !q.suggestedAnswer?.length)
        report(path, 'Question without acceptedAnswer/suggestedAnswer');
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (
      key === 'publisher' &&
      value &&
      typeof value === 'object' &&
      value['@id'] &&
      !value['@type']
    )
      ctx.refs.add(value['@id']);
    if (typeof value === 'object') walk(value, path, ctx, depth + 1);
  }
}
for (const path of paths) {
  const res = await fetch(base + path, { headers: { 'user-agent': 'konsepthane-seo-audit' } });
  if (!res.ok) {
    console.log(`  – ${path}: HTTP ${res.status} (skipped)`);
    continue;
  }
  const html = await res.text();
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((m) => m[1]);
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1] ?? null;
  const ctx = { types: [], ids: new Set(), refs: new Set(), canonical };
  if (/\/editor\//.test(path)) {
    const robotsMeta = (html.match(/<meta name="robots" content="([^"]+)"/) ?? [])[1] ?? 'index';
    if (/noindex/.test(robotsMeta)) report(path, 'editor page is noindex');
    if (canonical !== base + path)
      report(path, `editor page canonical ${canonical} !== ${base + path}`);
    if (!html.includes('"ProfilePage"')) report(path, 'editor page without ProfilePage');
  }
  for (const raw of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      report(path, 'invalid JSON-LD');
      continue;
    }
    walk(parsed, path, ctx);
  }
  const counts = ctx.types.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map());
  for (const t of [
    'WebSite',
    'Organization',
    'BreadcrumbList',
    'Article',
    'QAPage',
    'DiscussionForumPosting',
  ]) {
    if ((counts.get(t) ?? 0) > 1 && !(t === 'Organization' && path !== '/tr'))
      report(path, `duplicate ${t} (${counts.get(t)})`);
  }
  const robots = (html.match(/<meta name="robots" content="([^"]+)"/) ?? [])[1] ?? 'index';
  if (/noindex/.test(robots) && ctx.types.length)
    console.log(`  · ${path}: noindex page carries ${ctx.types.length} entities (harmless)`);
  console.log(
    `  ✓ ${path}: ${[...counts.entries()].map(([t, n]) => (n > 1 ? `${t}×${n}` : t)).join(', ') || 'no structured data'}`,
  );
}
// Every Person author on editorial content must resolve to a live, indexable, self-canonical
// editor page whose ProfilePage entity carries the same @id.
for (const { path, url, id } of authorChecks) {
  const res = await fetch(url, { headers: { 'user-agent': 'konsepthane-seo-audit' } });
  if (!res.ok) {
    report(path, `author profile ${url} returned HTTP ${res.status}`);
    continue;
  }
  const html = await res.text();
  const robotsMeta = (html.match(/<meta name="robots" content="([^"]+)"/) ?? [])[1] ?? 'index';
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1] ?? null;
  if (/noindex/.test(robotsMeta)) report(path, `author profile ${url} is noindex`);
  if (canonical !== url) report(path, `author profile ${url} canonical is ${canonical}`);
  if (id && !html.includes(JSON.stringify(id)))
    report(path, `author @id ${id} not found on profile page`);
}
console.log(problems ? `\n${problems} problem(s)` : '\nno problems');
process.exit(problems ? 1 : 0);
