import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Android App Links: verifies that the Konsepthane app may open https://konsepthane.net/tr|en/...
 * ANDROID_CERT_SHA256 = comma-separated SHA-256 fingerprints of the signing certificates
 * (`eas credentials` → Android → Keystore, plus the Play App Signing key from Play Console).
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  if (!fingerprints.length) return new NextResponse(null, { status: 404 });
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: process.env.ANDROID_PACKAGE?.trim() || 'net.konsepthane.app',
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
  return NextResponse.json(body, {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
  });
}
