export const siteName = 'Konsepthane';
export const defaultDescription =
  'Doğum günü, baby shower, nişan ve kına için uygulanabilir konseptler, planlama rehberleri ve gerçek deneyimler.';

export function absoluteUrl(path: string, origin = process.env.WEB_URL ?? 'http://localhost:3000') {
  const normalizedOrigin = `${origin.replace(/\/$/, '')}/`;
  return new URL(path.replace(/^\//, ''), normalizedOrigin).toString();
}

export function websiteJsonLd(input: { url: string; language?: string; description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${input.url}#website`,
    url: input.url,
    name: siteName,
    description: input.description ?? defaultDescription,
    ...(input.language ? { inLanguage: input.language } : {}),
    publisher: { '@id': `${input.url}#organization` },
  };
}

export function organizationJsonLd(input: {
  url: string;
  logoUrl: string;
  legalName?: string | undefined;
  /** Social / directory profiles that verify the entity (only real, public URLs). */
  sameAs?: string[] | undefined;
  contactEmail?: string | undefined;
  contactUrl?: string | undefined;
  foundingYear?: string | undefined;
  addressLocality?: string | undefined;
  addressCountry?: string | undefined;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${input.url}#organization`,
    name: siteName,
    ...(input.legalName && input.legalName !== siteName ? { legalName: input.legalName } : {}),
    url: input.url,
    logo: {
      '@type': 'ImageObject',
      url: input.logoUrl,
      width: 512,
      height: 512,
    },
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
    ...(input.foundingYear ? { foundingDate: input.foundingYear } : {}),
    ...(input.addressLocality
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: input.addressLocality,
            ...(input.addressCountry ? { addressCountry: input.addressCountry } : {}),
          },
        }
      : {}),
    ...(input.contactEmail || input.contactUrl
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              availableLanguage: ['tr', 'en'],
              ...(input.contactEmail ? { email: input.contactEmail } : {}),
              ...(input.contactUrl ? { url: input.contactUrl } : {}),
            },
          ],
        }
      : {}),
  };
}

export function articleJsonLd(input: {
  url: string;
  headline: string;
  description: string;
  images?: string[] | undefined;
  datePublished?: string | null | undefined;
  dateModified?: string | null | undefined;
  /**
   * Visible author. A real editor is a `Person` with a stable `@id` (`<profile url>#person`) that
   * matches the ProfilePage entity; corporate content without a named author uses the publisher
   * Organization — never an invented person.
   */
  author:
    | {
        type: 'Person';
        name: string;
        url?: string | null | undefined;
        id?: string | null | undefined;
      }
    | { type: 'Organization' };
  publisherUrl?: string | undefined;
  section?: string | null | undefined;
  language?: string | undefined;
  citations?: string[] | undefined;
}) {
  const publisherUrl = input.publisherUrl ?? absoluteUrl('/');
  const author =
    input.author.type === 'Person'
      ? {
          '@type': 'Person',
          ...(input.author.id ? { '@id': input.author.id } : {}),
          name: input.author.name,
          ...(input.author.url ? { url: input.author.url } : {}),
        }
      : { '@id': `${publisherUrl}#organization` };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${input.url}#article`,
    mainEntityOfPage: input.url,
    headline: input.headline,
    description: input.description,
    ...(input.images?.length ? { image: input.images } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.section ? { articleSection: input.section } : {}),
    ...(input.language ? { inLanguage: input.language } : {}),
    ...(input.citations?.length ? { citation: input.citations } : {}),
    author,
    publisher: {
      '@type': 'Organization',
      '@id': `${publisherUrl}#organization`,
      name: siteName,
      url: publisherUrl,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/placeholders/konsepthane-mark.svg', new URL(publisherUrl).origin),
        width: 512,
        height: 512,
      },
    },
  };
}

export function itemListJsonLd(input: {
  url: string;
  name: string;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${input.url}#item-list`,
    name: input.name,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

type DiscussionCommentInput = {
  text: string;
  authorName: string;
  authorUrl?: string | null | undefined;
  datePublished?: string | null | undefined;
  likeCount?: number | undefined;
  url?: string | undefined;
  comments?: DiscussionCommentInput[] | undefined;
};

export function discussionForumJsonLd(input: {
  url: string;
  headline: string;
  text: string;
  authorName: string;
  authorUrl?: string | null | undefined;
  datePublished?: string | null | undefined;
  dateModified?: string | null | undefined;
  likeCount?: number | undefined;
  commentCount?: number | undefined;
  comments?: DiscussionCommentInput[] | undefined;
}) {
  if (!input.datePublished) return null;
  const comment = (entry: DiscussionCommentInput): Record<string, unknown> => ({
    '@type': 'Comment',
    text: entry.text,
    author: {
      '@type': 'Person',
      name: entry.authorName,
      ...(entry.authorUrl ? { url: entry.authorUrl } : {}),
    },
    ...(entry.url ? { url: entry.url } : {}),
    ...(entry.datePublished ? { datePublished: entry.datePublished } : {}),
    ...(entry.likeCount !== undefined
      ? {
          interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: entry.likeCount,
          },
        }
      : {}),
    ...(entry.comments?.length ? { comment: entry.comments.map(comment) } : {}),
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': `${input.url}#posting`,
    mainEntityOfPage: input.url,
    url: input.url,
    headline: input.headline,
    text: input.text,
    author: {
      '@type': 'Person',
      name: input.authorName,
      ...(input.authorUrl ? { url: input.authorUrl } : {}),
    },
    datePublished: input.datePublished,
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.likeCount !== undefined
      ? {
          interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: input.likeCount,
          },
        }
      : {}),
    ...(input.commentCount !== undefined ? { commentCount: input.commentCount } : {}),
    ...(input.comments?.length ? { comment: input.comments.map(comment) } : {}),
  };
}

/**
 * ProfilePage for a real, public editor. `mainEntity` is the Person that Article authors point to
 * via `@id` (`<url>#person`), so author and profile are one entity for search engines.
 */
export function profilePageJsonLd(input: {
  url: string;
  name: string;
  description?: string | null | undefined;
  image?: string | null | undefined;
  jobTitle?: string | null | undefined;
  sameAs?: string[] | undefined;
  dateCreated?: string | null | undefined;
  dateModified?: string | null | undefined;
  worksForUrl?: string | undefined;
}) {
  const worksForUrl = input.worksForUrl ?? absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${input.url}#profilepage`,
    url: input.url,
    ...(input.dateCreated ? { dateCreated: input.dateCreated } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    mainEntity: {
      '@type': 'Person',
      '@id': `${input.url}#person`,
      name: input.name,
      url: input.url,
      ...(input.image ? { image: input.image } : {}),
      ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
      worksFor: { '@id': `${worksForUrl}#organization` },
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export type CommunitySeoInput = {
  title: string;
  body: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'HIDDEN' | 'REMOVED';
  moderationStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  canonicalPath?: string | null;
  isDuplicate?: boolean;
  isSpam?: boolean;
};

export function evaluateCommunityIndexability(input: CommunitySeoInput) {
  const reasons: string[] = [];
  if (input.visibility !== 'PUBLIC') reasons.push('not_public');
  if (input.moderationStatus !== 'APPROVED') reasons.push('not_approved');
  if (input.title.trim().length < 10) reasons.push('thin_title');
  if (input.body.trim().length < 120) reasons.push('thin_body');
  if (!input.canonicalPath?.startsWith('/')) reasons.push('missing_canonical');
  if (input.isDuplicate) reasons.push('duplicate');
  if (input.isSpam) reasons.push('spam');
  return {
    indexable: reasons.length === 0,
    robots: reasons.length ? 'noindex,follow' : 'index,follow',
    reasons,
  } as const;
}

export function qaPageJsonLd(input: {
  question: string;
  body: string;
  url: string;
  authorName?: string | null | undefined;
  dateCreated?: string | null | undefined;
  answers: Array<{
    body: string;
    url?: string | undefined;
    accepted?: boolean | undefined;
    authorName?: string | null | undefined;
    upvoteCount?: number | undefined;
    dateCreated?: string | null | undefined;
  }>;
}) {
  if (!input.answers.length) return null;
  const accepted = input.answers.find((answer) => answer.accepted);
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: input.question,
      text: input.body,
      url: input.url,
      answerCount: input.answers.length,
      ...(input.authorName ? { author: { '@type': 'Person', name: input.authorName } } : {}),
      ...(input.dateCreated ? { dateCreated: input.dateCreated } : {}),
      ...(accepted
        ? {
            acceptedAnswer: {
              '@type': 'Answer',
              text: accepted.body,
              ...(accepted.url ? { url: accepted.url } : {}),
              ...(accepted.authorName
                ? { author: { '@type': 'Person', name: accepted.authorName } }
                : {}),
              ...(accepted.upvoteCount !== undefined ? { upvoteCount: accepted.upvoteCount } : {}),
              ...(accepted.dateCreated ? { dateCreated: accepted.dateCreated } : {}),
            },
          }
        : {}),
      suggestedAnswer: input.answers
        .filter((answer) => !answer.accepted)
        .map((answer) => ({
          '@type': 'Answer',
          text: answer.body,
          ...(answer.url ? { url: answer.url } : {}),
          ...(answer.authorName ? { author: { '@type': 'Person', name: answer.authorName } } : {}),
          ...(answer.upvoteCount !== undefined ? { upvoteCount: answer.upvoteCount } : {}),
          ...(answer.dateCreated ? { dateCreated: answer.dateCreated } : {}),
        })),
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Hub indexability policy (kept in this file: the API loads the package source directly with Node's
// TypeScript support, which requires explicit extensions for relative imports).
// ---------------------------------------------------------------------------------------------
/**
 * Indexability policy for taxonomy hubs (topic pages and curated landing pages).
 *
 * The goal is to keep thin, near-duplicate taxonomy pages out of the index while never hiding a
 * genuinely useful hub just because it is small today. The decision is deterministic and explained
 * by `reasons`, so editors and the audit script can see why a page is (not) indexable.
 *
 * Signals (all optional except the counts):
 * - `counts`      — content behind the hub, per type (concepts, experiences, questions, guides…)
 * - `description` — editorial description length (unique text that is not just the list)
 * - `imageCount`  — distinct images the hub can show (visual pages need at least one)
 * - `featured`    — editor flagged the hub as important (counts as inbound-link support)
 * - `inboundLinks`— known crawlable inbound links (nav/chips/breadcrumbs); undefined = unknown
 * - `override`    — editorial decision that wins over the heuristics
 * - `isDuplicateOf` — slug of another hub with the same item set (then never index)
 */
export type HubContentCounts = {
  concepts?: number;
  experiences?: number;
  questions?: number;
  discussions?: number;
  guides?: number;
  polls?: number;
  collections?: number;
};

export type HubIndexInput = {
  counts: HubContentCounts;
  description?: string | null | undefined;
  imageCount?: number | undefined;
  featured?: boolean | undefined;
  inboundLinks?: number | undefined;
  override?: 'INDEX' | 'NOINDEX' | null | undefined;
  isDuplicateOf?: string | null | undefined;
};

export type HubIndexDecision = {
  indexable: boolean;
  score: number;
  reasons: string[];
};

/** Minimum editorial description length that counts as unique content (in characters). */
export const HUB_MIN_DESCRIPTION = 60;
/** Score needed to index; see `shouldIndexHub` for how points accrue. */
export const HUB_INDEX_THRESHOLD = 4;

export function totalHubItems(counts: HubContentCounts) {
  return Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);
}

/**
 * Scoring (points):
 *   +1 per primary item (concept / guide), max 4
 *   +1 per 2 UGC items (experience / question / discussion), max 2
 *   +1 when at least two different content types are present (a real hub, not a list dump)
 *   +1 editorial description >= 60 chars
 *   +1 at least one image
 *   +1 featured or >= 2 known inbound links
 * Index when score >= 4 and there are at least 2 items. Never index 0-item or duplicate hubs.
 * `override` always wins.
 */
export function shouldIndexHub(input: HubIndexInput): HubIndexDecision {
  const reasons: string[] = [];
  const counts = input.counts;
  const total = totalHubItems(counts);
  if (input.override === 'NOINDEX')
    return { indexable: false, score: 0, reasons: ['override_noindex'] };
  if (input.override === 'INDEX')
    return { indexable: true, score: 99, reasons: ['override_index'] };
  if (input.isDuplicateOf)
    return { indexable: false, score: 0, reasons: [`duplicate_of:${input.isDuplicateOf}`] };
  if (total === 0) return { indexable: false, score: 0, reasons: ['empty'] };

  let score = 0;
  const primary = (counts.concepts ?? 0) + (counts.guides ?? 0);
  const ugc = (counts.experiences ?? 0) + (counts.questions ?? 0) + (counts.discussions ?? 0);
  const primaryPoints = Math.min(primary, 4);
  if (primaryPoints) {
    score += primaryPoints;
    reasons.push(`primary_items:${primary}`);
  }
  const ugcPoints = Math.min(Math.floor(ugc / 2), 2);
  if (ugcPoints) {
    score += ugcPoints;
    reasons.push(`ugc_items:${ugc}`);
  }
  const types = Object.values(counts).filter((value) => (value ?? 0) > 0).length;
  if (types >= 2) {
    score += 1;
    reasons.push(`content_types:${types}`);
  }
  if ((input.description?.trim().length ?? 0) >= HUB_MIN_DESCRIPTION) {
    score += 1;
    reasons.push('editorial_description');
  } else {
    reasons.push('thin_description');
  }
  if ((input.imageCount ?? 0) > 0) {
    score += 1;
    reasons.push('has_images');
  }
  if (input.featured || (input.inboundLinks ?? 0) >= 2) {
    score += 1;
    reasons.push('link_support');
  }
  if (total < 2) reasons.push('too_few_items');
  const indexable = total >= 2 && score >= HUB_INDEX_THRESHOLD;
  reasons.push(indexable ? 'index' : 'noindex');
  return { indexable, score, reasons };
}
