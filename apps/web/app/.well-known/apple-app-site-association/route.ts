import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * iOS Universal Links: lets https://konsepthane.net/tr|en/... open inside the Konsepthane app.
 * Served only when APPLE_TEAM_ID is configured (App Store Connect → Membership → Team ID).
 * The app's bundle id is fixed in konsepthane-mobile/app.json.
 */
export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) return new NextResponse(null, { status: 404 });
  const appId = `${teamId}.${process.env.IOS_BUNDLE_ID?.trim() || 'net.konsepthane.app'}`;
  const body = {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: [
            { '/': '/tr/*', comment: 'Turkish site routes' },
            { '/': '/en/*', comment: 'English site routes' },
            { '/': '/admin/*', exclude: true, comment: 'Admin panel stays in the browser' },
            { '/': '/api/*', exclude: true },
          ],
        },
      ],
    },
    webcredentials: { apps: [appId] },
  };
  return NextResponse.json(body, {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
  });
}
