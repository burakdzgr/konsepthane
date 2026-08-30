'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { openAuthModal } from '@/components/auth-modal';
import { useSession } from '@/components/session/session-provider';
import { toggleTopicFollowAction } from '@/lib/actions';

/**
 * "Takip et" on a topic hub. Guests get the auth modal (no navigation); members toggle the
 * follow, the session snapshot is refreshed (followed topics live there) and the page re-renders
 * so the follower count in the sidebar updates.
 */
export function TopicFollowButton({
  topicId,
  slug,
  next,
  labels,
}: {
  topicId: string;
  slug: string;
  next: string;
  labels: { follow: string; following: string };
}) {
  const session = useSession();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const followed = optimistic ?? session.followedTopics.has(slug);

  useEffect(() => {
    // Once the snapshot catches up, drop the optimistic value.
    setOptimistic(null);
  }, [session.version]);

  const onClick = () => {
    if (session.status !== 'ready') return;
    if (!session.member) {
      openAuthModal(next);
      return;
    }
    const nextState = !followed;
    setOptimistic(nextState);
    start(async () => {
      const result = await toggleTopicFollowAction(topicId);
      if ('error' in result) {
        setOptimistic(null);
        if (result.error === 'unauthenticated') openAuthModal(next);
        return;
      }
      await session.refresh();
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      aria-pressed={followed}
      disabled={pending || session.status !== 'ready'}
      onClick={onClick}
      className={`btn ${followed ? 'btn-primary' : 'btn-ghost'} topic-follow-btn`}
    >
      {followed ? labels.following : labels.follow}
    </button>
  );
}
