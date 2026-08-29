import { shouldIndexHub, type HubContentCounts, type HubIndexDecision } from '@ilham/seo';

/** Maps API content-type keys onto the policy's count buckets. */
export function hubCountsFromTopic(topic: {
  contentCounts?: Record<string, number> | undefined;
}): HubContentCounts {
  const c = topic.contentCounts ?? {};
  return {
    concepts: c.INSPIRATION ?? 0,
    guides: c.GUIDE ?? 0,
    experiences: c.EVENT_EXPERIENCE ?? 0,
    questions: c.QUESTION ?? 0,
    discussions: c.DISCUSSION ?? 0,
    polls: c.POLL ?? 0,
  };
}

/**
 * Single place where a topic hub's indexability is decided (page metadata, topic index list and
 * the sitemap all call this). Header chips count as inbound-link support for featured topics.
 */
export type TopicIndexInput = {
  contentCounts?: Record<string, number> | undefined;
  description?: string | null | undefined;
  featured?: boolean | undefined;
  imageCount?: number | undefined;
  contentCount?: number | undefined;
};

export function topicIndexDecision(topic: TopicIndexInput): HubIndexDecision {
  const counts = hubCountsFromTopic(topic);
  // List responses do not carry image counts; concepts always have a hero image.
  const imageCount = topic.imageCount ?? counts.concepts ?? 0;
  return shouldIndexHub({
    counts,
    description: topic.description,
    imageCount,
    featured: topic.featured ?? false,
  });
}
