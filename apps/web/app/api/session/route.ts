import { NextResponse, type NextRequest } from 'next/server';
import { getFollowedTopics, getInteractionState, getMember, getSavedKeys } from '@/lib/auth';
import { getMyCollections } from '@/lib/community';

export const dynamic = 'force-dynamic';

/**
 * Per-visitor session snapshot for client islands. Pages themselves render without reading
 * cookies (so they can be static / ISR); the header, save/like toggles and forms hydrate their
 * personal state from this endpoint after load. Optional `content=TYPE:id` adds the interaction
 * state and the member's boards for one content item.
 */
export async function GET(request: NextRequest) {
  const member = await getMember();
  const content = request.nextUrl.searchParams.get('content');
  const [contentType, contentId] = content?.split(':') ?? [];
  const [saved, interaction, collections, followedTopics] = member
    ? await Promise.all([
        getSavedKeys(),
        contentType && contentId ? getInteractionState(contentType, contentId) : null,
        contentType && contentId ? getMyCollections() : [],
        getFollowedTopics(),
      ])
    : [new Set<string>(), null, [], []];
  return NextResponse.json(
    {
      member,
      saved: [...saved],
      interaction,
      collections,
      followedTopics: followedTopics.map((topic) => topic.slug),
    },
    { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
  );
}
