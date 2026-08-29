#!/usr/bin/env node
/**
 * Lab Core Web Vitals against a production build (`next build && next start`). Requires Playwright.
 *
 *   pnpm seo:cwv                                   # http://localhost:3300, default pages
 *   SEO_AUDIT_BASE=http://localhost:3300 node scripts/seo-cwv.mjs /tr /tr/konu/ayicik
 *   RUNS=5 node scripts/seo-cwv.mjs
 *
 * Methodology (so the numbers can be trusted, and so nobody mistakes them for field data):
 * - A fresh browser context per run: cold HTTP cache, no service worker, no shared connections.
 * - Network throttling is SIMULATED at request level with `context.route` (every request, including
 *   the document, is delayed by RTT + bytes / bandwidth before it is fulfilled) and installed BEFORE
 *   `page.goto`. DevTools' `Network.emulateNetworkConditions` proved not to affect the document
 *   request reliably under Playwright, which made TTFB look impossibly low; the route-based model
 *   is deterministic and the script asserts TTFB >= RTT. CPU throttling still uses CDP.
 * - Mobile profile ≈ "slow 4G": 150 ms RTT, 1.6 Mbps down, 750 Kbps up, 4× CPU slowdown.
 * - Every page runs RUNS times (default 3); the median is reported.
 * - INP proxy: a scripted interaction sequence (open menu, close it, focus + type in search, click
 *   a topic chip) with the Event Timing API; the worst interaction duration is reported. Real INP
 *   is a field metric over a session; this is a lab regression signal only.
 * - Byte columns are transfer sizes as seen by the page; under route-based throttling bodies are
 *   delivered uncompressed, so js/css/html read larger than the desktop (gzip/br) run.
 * - These are LAB numbers. Field data comes from CrUX (Search Console › Core Web Vitals).
 */
const base = (process.env.SEO_AUDIT_BASE ?? 'http://localhost:3300').replace(/\/$/, '');
const runs = Number(process.env.RUNS ?? 3);
const paths = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      '/tr',
      '/tr/konsept/1-yas-ayicik-temali-dogum-gunu-konsepti',
      '/tr/kategori/dogum-gunu',
      '/tr/konu/ayicik',
      '/tr/soru/ayicik-konsepti-icin-arka-fon-kac-metre-olmali',
      '/tr/fikirler',
    ];
const { chromium } = await import('playwright');

const profiles = {
  mobile: {
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    },
    network: {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    },
    cpu: 4,
  },
  desktop: { context: { viewport: { width: 1366, height: 900 } }, network: null, cpu: 1 },
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

// wait for the server
for (let i = 0; i < 60; i += 1) {
  try {
    if ((await fetch(`${base}/tr`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 2000));
}

async function measure(browser, profile, path) {
  const ctx = await browser.newContext(profile.context);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (profile.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  if (profile.network) {
    const { latency, downloadThroughput } = profile.network;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await ctx.route('**/*', async (route) => {
      const response = await route.fetch();
      const body = await response.body();
      // RTT once per request + serialisation time at the emulated bandwidth (bytes/s).
      await sleep(latency + (body.length / downloadThroughput) * 1000);
      await route.fulfill({ response, body });
    });
  }
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0, interactions: [] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (e.interactionId)
            window.__vitals.interactions.push({ name: e.name, duration: e.duration });
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch {}
  });
  const response = await page.goto(base + path, { waitUntil: 'load', timeout: 180000 });
  await page.waitForTimeout(1500);
  // Scripted interactions for the INP proxy (each awaited so the previous one's paint settles).
  const interactions = [];
  const tryDo = async (label, fn) => {
    try {
      await fn();
      await page.waitForTimeout(400);
      interactions.push(label);
    } catch {}
  };
  const isMobile = Boolean(profile.context.isMobile);
  if (isMobile) {
    await tryDo('open-menu', () => page.click('.mobile-menu-button', { timeout: 3000 }));
    await tryDo('close-menu', () => page.keyboard.press('Escape'));
  } else {
    await tryDo('focus-search', () => page.click('#site-search', { timeout: 3000 }));
    await tryDo('type-search', () => page.keyboard.type('ayıcık'));
  }
  await tryDo('topic-chip', () =>
    page.click('.topic-chips a, .topic-strip a, .mobile-drawer-topic-grid a', {
      timeout: 3000,
      noWaitAfter: true,
    }),
  );
  await page.waitForTimeout(800);
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const kb = (filter) =>
      Math.round(resources.filter(filter).reduce((n, r) => n + (r.transferSize || 0), 0) / 1024);
    const worst = window.__vitals.interactions.reduce((m, e) => Math.max(m, e.duration), 0);
    return {
      ttfb: Math.round(nav.responseStart),
      fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0),
      lcp: Math.round(window.__vitals.lcp),
      cls: Number(window.__vitals.cls.toFixed(3)),
      inp: Math.round(worst),
      interactions: window.__vitals.interactions.length,
      htmlKB: Math.round((nav.transferSize || 0) / 1024),
      jsKB: kb((r) => r.initiatorType === 'script'),
      cssKB: kb((r) => r.initiatorType === 'link' && /\.css/.test(r.name)),
      fontKB: kb((r) => /\.woff2?/.test(r.name)),
      imgKB: kb((r) => r.initiatorType === 'img' || /\/_next\/image/.test(r.name)),
      requests: resources.length + 1,
      serviceWorker: Boolean(navigator.serviceWorker?.controller),
    };
  });
  await ctx.close();
  return { status: response?.status(), ...metrics, done: interactions };
}

const browser = await chromium.launch();
console.log(`Lab CWV — ${base} · ${runs} run(s) per page, cold context each run (medians)`);
for (const [name, profile] of Object.entries(profiles)) {
  console.log(
    `\n--- ${name}${profile.network ? ` (RTT ${profile.network.latency} ms, ${Math.round(((profile.network.downloadThroughput * 8) / 1024 / 1024) * 10) / 10} Mbps, CPU ×${profile.cpu})` : ' (no throttling)'}`,
  );
  console.log(
    'status path                                             ttfb  fcp   lcp   cls    inp   html  js    css   font  img   reqs',
  );
  for (const path of paths) {
    const samples = [];
    for (let i = 0; i < runs; i += 1) samples.push(await measure(browser, profile, path));
    const med = (key) => median(samples.map((s) => s[key]));
    const sw = samples.some((s) => s.serviceWorker) ? ' [SW!]' : '';
    const warn =
      profile.network && med('ttfb') < profile.network.latency ? ' [throttle not applied?]' : '';
    console.log(
      `${String(samples[0].status).padEnd(6)} ${path.padEnd(52)} ${String(med('ttfb')).padEnd(5)} ${String(med('fcp')).padEnd(5)} ${String(med('lcp')).padEnd(5)} ${String(med('cls')).padEnd(6)} ${String(med('inp')).padEnd(5)} ${String(med('htmlKB')).padEnd(5)} ${String(med('jsKB')).padEnd(5)} ${String(med('cssKB')).padEnd(5)} ${String(med('fontKB')).padEnd(5)} ${String(med('imgKB')).padEnd(5)} ${med('requests')}${sw}${warn}`,
    );
  }
}
await browser.close();
console.log('\nLab numbers only — field (CrUX) data is the ranking signal; see docs/SEO.md.');
