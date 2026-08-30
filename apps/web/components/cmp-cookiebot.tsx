'use client';

import { useEffect } from 'react';

/**
 * Google-certified CMP (Cookiebot / Usercentrics, IAB TCF v2.2) drives all consent:
 * - `CookiebotHead` (server, in <head>): Consent Mode v2 defaults = denied for every signal,
 *   then the Cookiebot script (`data-blockingmode="auto"` holds back any tag until consent).
 *   Cookiebot sends the `consent update` calls itself (Google Consent Mode enabled in the
 *   Cookiebot dashboard), so `ad_storage`, `ad_user_data`, `ad_personalization` and
 *   `analytics_storage` follow the visitor's category choices (marketing / statistics).
 * - GA4 runs in Consent Mode **advanced**: gtag.js is injected by the same bootstrap (marked
 *   `data-cookieconsent="ignore"` so Cookiebot's auto-blocking leaves it alone) while every
 *   storage signal is `denied` — no cookies, anonymous pings only — until the visitor accepts;
 *   Cookiebot then sends the `consent update`. `CookiebotBridge` is only a fallback that loads the
 *   tag if the bootstrap did not (and hosts the `?cookiebot=show` design-QA trigger).
 * Without `NEXT_PUBLIC_COOKIEBOT_ID` neither the CMP nor GA is rendered — the safe default.
 * The dialog's look is themed in globals.css ("Cookiebot dialog" section) to match the site.
 */
type CookiebotApi = {
  consent?: { statistics?: boolean; marketing?: boolean; preferences?: boolean };
  renew?: () => void;
  show?: () => void;
};
type CmpWindow = Window & {
  Cookiebot?: CookiebotApi;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function CookiebotHead({
  cbid,
  locale,
  nonce,
  gaId,
}: {
  cbid?: string | undefined;
  locale: string;
  /** CSP nonce from proxy.ts (`x-nonce`); required for the inline bootstrap under strict CSP. */
  nonce?: string | undefined;
  /** GA4 measurement id. Loaded in Consent Mode "advanced": the tag is present from the first
   *  paint but every storage signal starts `denied` (cookieless pings only); Cookiebot upgrades
   *  the signals when the visitor accepts statistics/marketing. */
  gaId?: string | undefined;
}) {
  if (!cbid) return null;
  // One inline script so the order is deterministic even though React hoists resource scripts:
  // Consent Mode v2 defaults (all denied) are set first, then gtag.js and uc.js are injected.
  const ga = gaId
    ? "(function(){var g=document.createElement('script');g.id='kh-ga';g.async=true;g.setAttribute('data-cookieconsent','ignore');" +
      `g.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(${JSON.stringify(gaId)});document.head.appendChild(g);})();` +
      `gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});`
    : '';
  const bootstrap =
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}' +
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});" +
    "gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',false);" +
    ga +
    "(function(){var s=document.createElement('script');s.id='Cookiebot';s.src='https://consent.cookiebot.com/uc.js';" +
    `s.setAttribute('data-cbid',${JSON.stringify(cbid)});s.setAttribute('data-blockingmode','auto');s.setAttribute('data-culture',${JSON.stringify(locale)});` +
    's.async=true;document.head.appendChild(s);})();';
  return (
    <script
      id="kh-consent-bootstrap"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: bootstrap }}
    />
  );
}

function loadAnalytics(gaId: string) {
  const w = window as CmpWindow;
  if (document.getElementById('kh-ga')) return;
  w.dataLayer = w.dataLayer ?? [];
  w.gtag =
    w.gtag ??
    function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    };
  w.gtag('js', new Date());
  w.gtag('config', gaId);
  const script = document.createElement('script');
  script.id = 'kh-ga';
  script.async = true;
  // Cookiebot's auto-blocking honours this attribute; we also only inject after consent.
  script.setAttribute('data-cookieconsent', 'statistics');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);
}

export function CookiebotBridge({
  cbid,
  gaId,
}: {
  cbid?: string | undefined;
  gaId?: string | undefined;
}) {
  useEffect(() => {
    if (!cbid || !gaId) return;
    const sync = () => {
      const w = window as CmpWindow;
      if (w.Cookiebot?.consent?.statistics) loadAnalytics(gaId);
    };
    sync();
    window.addEventListener('CookiebotOnAccept', sync);
    window.addEventListener('CookiebotOnLoad', sync);
    return () => {
      window.removeEventListener('CookiebotOnAccept', sync);
      window.removeEventListener('CookiebotOnLoad', sync);
    };
  }, [cbid, gaId]);
  useEffect(() => {
    // Design QA: `?cookiebot=show` re-opens the dialog even when consent is already stored,
    // so the themed CMP can be inspected repeatedly without clearing cookies.
    if (!cbid || !new URLSearchParams(window.location.search).has('cookiebot')) return;
    const reopen = () => {
      const w = window as CmpWindow;
      (w.Cookiebot?.renew ?? w.Cookiebot?.show)?.();
    };
    window.addEventListener('CookiebotOnLoad', reopen);
    const timer = window.setTimeout(reopen, 1500);
    return () => {
      window.removeEventListener('CookiebotOnLoad', reopen);
      window.clearTimeout(timer);
    };
  }, [cbid]);
  return null;
}

/** Footer "Çerez ayarları": re-opens the CMP dialog so choices can be changed any time. */
export function CookieSettingsLink({ label, cbid }: { label: string; cbid?: string | undefined }) {
  if (!cbid) return null;
  return (
    <button
      type="button"
      className="footer-link-button"
      onClick={() => {
        const w = window as CmpWindow;
        (w.Cookiebot?.renew ?? w.Cookiebot?.show)?.();
      }}
    >
      {label}
    </button>
  );
}
