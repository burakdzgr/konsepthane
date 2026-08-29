import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { defaultDescription, siteName } from '@ilham/seo';

export const alt = `${siteName} — kutlama fikirleri ve gerçek deneyimler`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Default social image (PNG). SVG is not accepted as an Open Graph image by Facebook, X, WhatsApp
 * or LinkedIn, so the brand card is rasterised here; pages with a hero image override it.
 */
export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), 'public', 'brand', 'og-logo-960.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #fffdfb 0%, #fde8ea 100%)',
          color: '#201b18',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex' }}>
          <img src={logoSrc} width={478} height={128} alt="" style={{ width: 478, height: 128 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
            Kutlaman için ilham bul.
          </div>
          <div style={{ fontSize: 28, color: '#6f6761', maxWidth: 900, lineHeight: 1.4 }}>
            {defaultDescription}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 24,
            color: '#8f2e39',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          <span>Doğum günü · Baby shower · Nişan · Söz &amp; Kına</span>
          <span>Gerçek deneyimler</span>
        </div>
      </div>
    ),
    size,
  );
}
