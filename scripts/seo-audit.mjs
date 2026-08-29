#!/usr/bin/env node
/**
 * Pre-deployment SEO audit (crawl based, server HTML only — the same view Googlebot's first pass gets).
 *
 *   pnpm seo:audit                      # crawls http://localhost:3200/tr
 *   SEO_AUDIT_BASE=https://konsepthane.net pnpm seo:audit
 *   pnpm seo:audit --max 600 --json report.json
 *
 * Exit code 1 on CRITICAL findings (broken links, sitemap non-200, noindex in sitemap, canonical to
 * 404/redirect, orphan indexable URLs, missing titles, conflicting robots/canonical). Warnings
 * (duplicate titles, multiple H1, empty anchors, indexable pages missing from sitemap) do not fail.
 */
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const base = (process.env.SEO_AUDIT_BASE ?? opt('--base', 'http://localhost:3200')).replace(
  /\/$/,
  '',
);
const start = opt('--start', '/tr');
const maxPages = Number(opt('--max', '400'));
const jsonOut = opt('--json', null);
const sitemapIndexPaths = opt(
  '--sitemaps',
  'sayfalar,kategoriler,konseptler,rehberler,deneyimler,sorular,tartismalar,konular,koleksiyonlar,editorler',
)
  .split(',')
  .map((f) => `/sitemap/${f}.xml`);

const attr = (html, re) => (html.match(re) ?? [])[1] ?? null;
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
function parseLinks(html) {
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const href = (attrs.match(/\shref="([^"]*)"/) ?? [])[1];
    const text = m[2]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const aria = (attrs.match(/aria-label="([^"]*)"/) ?? [])[1];
    const rel = (attrs.match(/\srel="([^"]*)"/) ?? [])[1] ?? '';
    out.push({ href: href === undefined ? null : decode(href), text, aria, rel });
  }
  return out;
}
async function get(path) {
  const chain = [];
  let url = path.startsWith('http') ? path : base + path;
  for (let hop = 0; hop < 6; hop += 1) {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'konsepthane-seo-audit' },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      chain.push({ status: res.status, url, location });
      if (!location) return { status: res.status, chain, html: '' };
      url = new URL(location, url).toString();
      continue;
    }
    const html = res.ok ? await res.text() : '';
    return { status: res.status, chain, html, finalUrl: url };
  }
  return { status: 599, chain, html: '' };
}
function analyse(path, html) {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim(),
  );
  return {
    title: attr(html, /<title>([^<]*)<\/title>/),
    description: attr(html, /<meta name="description" content="([^"]*)"/),
    canonical: attr(html, /<link rel="canonical" href="([^"]+)"/),
    robots: attr(html, /<meta name="robots" content="([^"]+)"/) ?? 'index, follow',
    hreflang: [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/gi)].map(
      (m) => ({ lang: m[1], href: m[2] }),
    ),
    h1s,
    jsonLdBlocks: (html.match(/<script type="application\/ld\+json">/g) ?? []).length,
    // Author transparency: editorial pages carry Article.author (Person editor or Organization),
    // and a Person author must link to an /editor/ profile.
    articleAuthor: (() => {
      const m = html.match(/"@type":"Article"[\s\S]*?"author":(\{[^}]*\})/);
      if (!m) return null;
      try {
        return JSON.parse(m[1]);
      } catch {
        return 'unparsable';
      }
    })(),
    links: parseLinks(html),
  };
}

const pages = new Map();
const inbound = new Map();
const queue = [start];
const redirectsSeen = [];
while (queue.length && pages.size < maxPages) {
  const path = queue.shift();
  if (pages.has(path)) continue;
  const res = await get(path);
  if (res.chain.length) redirectsSeen.push({ path, chain: res.chain });
  const info = { status: res.status, chain: res.chain, ...analyse(path, res.html) };
  pages.set(path, info);
  for (const l of info.links) {
    if (!l.href || !l.href.startsWith('/') || l.href.startsWith('//')) continue;
    const clean = l.href.split('#')[0];
    if (/^\/(api|_next|placeholders)\//.test(clean)) continue;
    if (!inbound.has(clean)) inbound.set(clean, new Set());
    inbound.get(clean).add(path);
    if (
      !pages.has(clean) &&
      !queue.includes(clean) &&
      clean.startsWith(start.split('/').slice(0, 2).join('/'))
    )
      queue.push(clean);
  }
}

// Sitemaps
const sitemapUrls = new Map(); // path -> family
for (const sm of sitemapIndexPaths) {
  const res = await fetch(base + sm);
  if (!res.ok) continue;
  const xml = await res.text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.set(new URL(m[1]).pathname, sm);
}
const sitemapChecks = [];
for (const [path] of sitemapUrls) {
  const info = pages.get(path) ?? { status: (await get(path)).status };
  if (!pages.has(path)) {
    const res = await get(path);
    pages.set(path, {
      status: res.status,
      chain: res.chain,
      ...analyse(path, res.html),
      fromSitemapOnly: true,
    });
  }
  const p = pages.get(path);
  sitemapChecks.push({
    path,
    status: p.status,
    robots: p.robots,
    canonical: p.canonical,
    redirected: p.chain?.length > 0,
  });
}

const abs = (u) => (u?.startsWith('http') ? new URL(u).pathname + new URL(u).search : u);
const critical = [];
const warnings = [];
for (const [path, p] of pages) {
  if (!/\/(konsept|rehber)\/[^/?]+$/.test(path) || p.status !== 200) continue;
  if (/noindex/.test(p.robots ?? '')) continue;
  if (!p.articleAuthor) critical.push(`${path}: indexable editorial page without Article.author`);
  else if (p.articleAuthor === 'unparsable') warnings.push(`${path}: Article.author not parsable`);
  else if (p.articleAuthor['@type'] === 'Person' && !/\/editor\//.test(p.articleAuthor.url ?? ''))
    critical.push(`${path}: Person author without /editor/ profile link (fake or member byline?)`);
}
for (const [path, p] of pages) {
  if (/\/editor\/[^/?]+$/.test(path) && p.status === 200 && /noindex/.test(p.robots ?? ''))
    critical.push(`${path}: editor page is noindex (inactive editors must 404, active ones index)`);
}
const isIndexable = (p) => p.status === 200 && !/noindex/.test(p.robots ?? '');
const isFiltered = (path) => path.includes('?');

for (const [path, p] of pages) {
  if (p.fromSitemapOnly) continue;
  if (p.status !== 200)
    critical.push(
      `broken_link ${path} (${p.status}) from ${[...(inbound.get(path) ?? [])].slice(0, 3).join(', ')}`,
    );
  if (p.chain?.length > 1)
    critical.push(`redirect_chain ${path} → ${p.chain.map((c) => c.location).join(' → ')}`);
  else if (p.chain?.length === 1) warnings.push(`redirect ${path} → ${p.chain[0].location}`);
  if (p.status !== 200) continue;
  if (!p.title) critical.push(`missing_title ${path}`);
  if (p.h1s.length === 0) warnings.push(`missing_h1 ${path}`);
  if (p.h1s.length > 1) warnings.push(`multiple_h1 ${path} (${p.h1s.length})`);
  for (const l of p.links) {
    if (l.href === null) warnings.push(`link_without_href ${path} "${l.text}"`);
    else if (!l.text && !l.aria) warnings.push(`empty_anchor ${path} -> ${l.href}`);
  }
  if (isIndexable(p) && !isFiltered(path)) {
    if (!p.canonical) critical.push(`missing_canonical ${path}`);
    else if (abs(p.canonical) !== path)
      warnings.push(`canonical_mismatch ${path} -> ${abs(p.canonical)}`);
    if (
      !sitemapUrls.has(path) &&
      !/^\/(tr|en)\/(giris|kaydedilenler|bildirimler|olustur|kesfet|uye|anket)/.test(path)
    )
      warnings.push(`indexable_not_in_sitemap ${path}`);
  }
  if (/noindex/.test(p.robots) && p.canonical && abs(p.canonical) !== path && !isFiltered(path))
    critical.push(
      `conflicting_robots_canonical ${path} noindex but canonical -> ${abs(p.canonical)}`,
    );
  if (p.canonical) {
    const target = abs(p.canonical);
    const tp = pages.get(target);
    if (tp && tp.status !== 200) critical.push(`canonical_to_${tp.status} ${path} -> ${target}`);
    if (tp && tp.chain?.length) critical.push(`canonical_to_redirect ${path} -> ${target}`);
  }
  for (const h of p.hreflang) {
    const hp = abs(h.href);
    const target = pages.get(hp);
    if (target && target.status !== 200)
      critical.push(`hreflang_to_${target.status} ${path} -> ${hp}`);
    if (target && /noindex/.test(target.robots ?? ''))
      warnings.push(`hreflang_to_noindex ${path} -> ${hp}`);
  }
}
for (const c of sitemapChecks) {
  if (c.status !== 200) critical.push(`sitemap_non_200 ${c.path} (${c.status})`);
  if (/noindex/.test(c.robots ?? '')) critical.push(`noindex_in_sitemap ${c.path}`);
  if (c.redirected) critical.push(`sitemap_redirect ${c.path}`);
  if (c.canonical && abs(c.canonical) !== c.path)
    critical.push(`sitemap_canonical_mismatch ${c.path} -> ${abs(c.canonical)}`);
  if (!inbound.has(c.path)) critical.push(`orphan_in_sitemap ${c.path}`);
}
// duplicates
const byTitle = new Map();
const byCanonical = new Map();
for (const [path, p] of pages) {
  if (p.status !== 200 || isFiltered(path) || !isIndexable(p)) continue;
  if (p.title) byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), path]);
  if (p.canonical)
    byCanonical.set(abs(p.canonical), [...(byCanonical.get(abs(p.canonical)) ?? []), path]);
}
for (const [title, paths] of byTitle)
  if (paths.length > 1) warnings.push(`duplicate_title "${title}" ${paths.join(', ')}`);
for (const [canon, paths] of byCanonical)
  if (paths.length > 1 && paths.some((x) => x !== canon))
    warnings.push(`duplicate_canonical ${canon} <- ${paths.join(', ')}`);

const summary = {
  base,
  crawled: [...pages.values()].filter((p) => !p.fromSitemapOnly).length,
  internalLinks: [...pages.values()].reduce((n, p) => n + (p.links?.length ?? 0), 0),
  sitemapUrls: sitemapUrls.size,
  indexablePages: [...pages.entries()].filter(
    ([u, p]) => !p.fromSitemapOnly && isIndexable(p) && !isFiltered(u),
  ).length,
  noindexPages: [...pages.entries()].filter(([, p]) => /noindex/.test(p.robots ?? '')).length,
  critical,
  warnings,
};
const line = (s) => console.log(s);
line(`SEO audit — ${base}${start}`);
line(
  `crawled ${summary.crawled} pages · ${summary.internalLinks} internal links · ${summary.sitemapUrls} sitemap URLs · ${summary.indexablePages} indexable · ${summary.noindexPages} noindex`,
);
line(`\nCRITICAL (${critical.length})`);
critical.forEach((c) => line(`  ✗ ${c}`));
line(`\nWARNINGS (${warnings.length})`);
warnings.slice(0, 60).forEach((w) => line(`  • ${w}`));
if (warnings.length > 60) line(`  … ${warnings.length - 60} more`);
if (jsonOut) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        ...summary,
        pages: Object.fromEntries(
          [...pages.entries()].map(([u, p]) => [
            u,
            {
              status: p.status,
              title: p.title,
              canonical: p.canonical,
              robots: p.robots,
              h1: p.h1s,
              links: p.links.length,
            },
          ]),
        ),
      },
      null,
      1,
    ),
  );
  line(`\nwrote ${jsonOut}`);
}
process.exit(critical.length ? 1 : 0);
