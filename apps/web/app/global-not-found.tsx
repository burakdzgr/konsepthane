import type { Metadata } from 'next';

/**
 * 404 for URLs outside the `[locale]` tree (the locale proxy redirects almost everything, so this
 * is mostly reached for file-like paths). Renders its own <html> because no layout applies here;
 * carries its own metadataBase so Next does not fall back to localhost for social images.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.WEB_URL ?? 'http://localhost:3000'),
  title: 'Sayfa bulunamadı · Konsepthane',
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#fdf7f1',
          color: '#201b18',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <main>
          <img
            src="/brand/konsepthane-logo.png?v=2"
            alt="Konsepthane"
            width={200}
            height={54}
            style={{ display: 'block', margin: '0 auto 1.5rem', width: 200, height: 'auto' }}
          />
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#c8414f',
            }}
          >
            404
          </p>
          <h1 style={{ margin: '0.5rem 0 0.75rem', fontSize: '1.75rem', lineHeight: 1.2 }}>
            Sayfa bulunamadı
          </h1>
          <p style={{ margin: '0 0 1.5rem', color: '#6b625c', lineHeight: 1.6 }}>
            Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.
          </p>
          <a
            href="/tr"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.4rem',
              borderRadius: 999,
              background: '#e2606c',
              color: '#fff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Ana sayfaya dön
          </a>
        </main>
      </body>
    </html>
  );
}
