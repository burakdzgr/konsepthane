#!/usr/bin/env node
/**
 * Server HTML vs rendered DOM comparison for SEO-critical fields. Requires Playwright
 * (`pnpm dlx playwright install chromium` or NODE_PATH to a scratch install).
 *
 *   pnpm seo:render                     # http://localhost:3200
 *   SEO_AUDIT_BASE=https://konsepthane.net node scripts/seo-render-check.mjs /tr /tr/konu/ayicik
 *
 * Exit 1 when hydration changes title, description, canonical, robots, hreflang, H1, JSON-LD types,
 * breadcrumb text, image URLs/alt or the set of internal hrefs.
 */
const base = (process.env.SEO_AUDIT_BASE ?? 'http://localhost:3200').replace(/\/$/, '');
const paths = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      '/tr',
      '/tr/kategori/dogum-gunu',
      '/tr/konu/ayicik',
      '/tr/konu',
      '/tr/konsept/1-yas-ayicik-temali-dogum-gunu-konsepti',
      '/tr/fikirler',
      '/tr/sorular',
      '/tr/soru/ayicik-konsepti-icin-arka-fon-kac-metre-olmali',
      '/tr/deneyim/evde-1-yas-ayicik-dogum-gunu-deneyimimiz',
      '/tr/uye/derya-ornek',
      '/tr/hakkimizda',
      '/tr/fikirler?kategori=dogum-gunu',
    ];
const { chromium } = await import('playwright');

const attr = (html, re) => (html.match(re) ?? [])[1] ?? null;
function fromServer(html) {
  return {
    title: attr(html, /<title>([^<]*)<\/title>/),
    description: attr(html, /<meta name="description" content="([^"]*)"/),
    canonical: attr(html, /<link rel="canonical" href="([^"]+)"/),
    robots: attr(html, /<meta name="robots" content="([^"]+)"/),
    hreflang: [...html.matchAll(/hrefLang="([^"]+)" href="([^"]+)"/gi)]
      .map((m) => `${m[1]}=${m[2]}`)
      .sort(),
    h1: (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1]?.replace(/<[^>]+>/g, '').trim() ?? null,
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => m[1])
      .flatMap((raw) => {
        try {
          const parsed = JSON.parse(raw);
          return (Array.isArray(parsed) ? parsed : [parsed]).map((x) => x['@type']);
        } catch {
          return ['INVALID'];
        }
      })
      .sort(),
    breadcrumb:
      (html.match(/<nav aria-label="[^"]*"[^>]*>\s*<ol[^>]*>([\s\S]*?)<\/ol>/) ?? [])[1]
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() ?? null,
    images: [...html.matchAll(/<img\b([^>]*)>/g)]
      .map(
        (m) =>
          `${(m[1].match(/\ssrc="([^"]*)"/) ?? [])[1]}|${(m[1].match(/\salt="([^"]*)"/) ?? [])[1] ?? ''}`,
      )
      .sort(),
    hrefs: [
      ...new Set(
        [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)]
          .map((m) => m[1].replace(/&amp;/g, '&'))
          .filter((h) => h.startsWith('/')),
      ),
    ].sort(),
  };
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let failures = 0;
for (const path of paths) {
  const serverHtml = await fetch(base + path, {
    headers: { 'user-agent': 'konsepthane-seo-audit' },
  }).then((r) => r.text());
  const server = fromServer(serverHtml);
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1500); // let session islands resolve
  const rendered = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name=description]')?.getAttribute('content') ?? null,
    canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null,
    robots: document.querySelector('meta[name=robots]')?.getAttribute('content') ?? null,
    hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')]
      .map((l) => `${l.getAttribute('hreflang')}=${l.getAttribute('href')}`)
      .sort(),
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')]
      .flatMap((s) => {
        try {
          const parsed = JSON.parse(s.textContent ?? '');
          return (Array.isArray(parsed) ? parsed : [parsed]).map((x) => x['@type']);
        } catch {
          return ['INVALID'];
        }
      })
      .sort(),
    breadcrumb:
      document.querySelector('nav[aria-label] ol')?.textContent?.replace(/\s+/g, ' ').trim() ??
      null,
    images: [...document.images]
      .map((i) => `${i.getAttribute('src')}|${i.getAttribute('alt') ?? ''}`)
      .sort(),
    hrefs: [
      ...new Set(
        [...document.querySelectorAll('a[href]')]
          .map((a) => a.getAttribute('href'))
          .filter((h) => h?.startsWith('/')),
      ),
    ].sort(),
  }));
  const diffs = [];
  // Breadcrumb separators are decorative (`<span aria-hidden>/</span>`); compare the text only.
  const crumbs = (value) => (value ?? '').replace(/[\s/]+/g, ' ').trim();
  for (const key of ['title', 'description', 'canonical', 'robots', 'h1', 'breadcrumb']) {
    const left = key === 'breadcrumb' ? crumbs(server[key]) : (server[key] ?? null);
    const right = key === 'breadcrumb' ? crumbs(rendered[key]) : (rendered[key] ?? null);
    if (left !== right)
      diffs.push(
        `${key}: server=${JSON.stringify(server[key])} dom=${JSON.stringify(rendered[key])}`,
      );
  }
  for (const key of ['hreflang', 'jsonLd']) {
    if (JSON.stringify(server[key]) !== JSON.stringify(rendered[key]))
      diffs.push(
        `${key}: server=${JSON.stringify(server[key])} dom=${JSON.stringify(rendered[key])}`,
      );
  }
  const serverImages = new Set(server.images);
  const missingImages = rendered.images.filter(
    (i) => !serverImages.has(i) && !i.startsWith('/_next/image'),
  );
  if (missingImages.length)
    diffs.push(`images only in DOM: ${missingImages.slice(0, 5).join(' ; ')}`);
  const serverHrefs = new Set(server.hrefs);
  const domOnly = rendered.hrefs.filter((h) => !serverHrefs.has(h));
  const serverOnly = server.hrefs.filter((h) => !rendered.hrefs.includes(h));
  // Session islands may swap the login link for profile links after hydration; that is expected and reported as info.
  const expected = (h) => /\/(giris|uye\/|kaydedilenler|bildirimler|olustur)/.test(h);
  const unexpectedDomOnly = domOnly.filter((h) => !expected(h));
  const unexpectedServerOnly = serverOnly.filter((h) => !expected(h));
  if (unexpectedDomOnly.length || unexpectedServerOnly.length)
    diffs.push(
      `hrefs differ: dom-only=${unexpectedDomOnly.slice(0, 5).join(',')} server-only=${unexpectedServerOnly.slice(0, 5).join(',')}`,
    );
  const info =
    domOnly.length + serverOnly.length
      ? ` (session links changed: +${domOnly.length}/-${serverOnly.length})`
      : '';
  if (diffs.length) {
    failures += 1;
    console.log(`✗ ${path}${info}`);
    diffs.forEach((d) => console.log(`    ${d}`));
  } else console.log(`✓ ${path}${info}`);
}
await browser.close();
process.exit(failures ? 1 : 0);
