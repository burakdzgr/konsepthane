import type {
  CommunityContentType,
  CommunityFeedItem,
  CommunityTopic,
  ConceptSummary,
  MemberCollection,
  SavedItem,
} from '@ilham/shared-types';
import { memberApi } from './auth';

const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type CommunityProfile = {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  kind?: 'MEMBER' | 'EDITOR';
  jobTitle?: string | null;
  editorActive?: boolean;
  isPublic?: boolean;
};
export type CommunityQuestion = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: string;
  indexability: string;
  answerCount: number;
  followerCount: number;
  reactionCount: number;
  saveCount: number;
  concept: { title: string; slug: string } | null;
  eventType: { name: string; slug: string } | null;
  images?: Array<{ id: string; url: string; altText: string }>;
  acceptedAnswerId: string | null;
  author: { profile: CommunityProfile | null };
  answers?: CommunityAnswer[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
};
export type CommunityAnswer = {
  id: string;
  body: string;
  helpfulCount: number;
  author: { profile: CommunityProfile | null };
  createdAt?: string;
  updatedAt?: string;
};
export type CommunityDiscussion = {
  id: string;
  title: string;
  slug: string;
  body: string;
  indexability: string;
  commentCount: number;
  followerCount: number;
  reactionCount: number;
  saveCount: number;
  locked: boolean;
  author: { profile: CommunityProfile | null };
  comments?: CommunityComment[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
};
export type CommunityComment = {
  id: string;
  body: string;
  reactionCount: number;
  author: { profile: CommunityProfile | null };
  replies: CommunityComment[];
  createdAt?: string;
  updatedAt?: string;
};
export type CommunityPoll = {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  voteCount: number;
  status: string;
  author: { profile: CommunityProfile | null };
  options: Array<{ id: string; label: string; voteCount: number }>;
};
export type CommunityGuide = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  reactionCount: number;
  saveCount: number;
  commentCount: number;
  author: { profile: CommunityProfile | null };
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
};
export type CommunityExperience = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  status: string;
  indexability: string;
  city: string | null;
  district: string | null;
  venueType: string | null;
  guestCount: number | null;
  ageLabel: string | null;
  budgetLabel: string | null;
  themeVariation: string | null;
  colors: string[];
  tips: string | null;
  whatWorked: string | null;
  whatWouldChange: string | null;
  heroImageUrl: string | null;
  reactionCount: number;
  saveCount: number;
  commentCount: number;
  author: { profile: CommunityProfile | null };
  concept: { id: string; title: string; slug: string; heroImageUrl: string | null } | null;
  eventType: { name: string; slug: string } | null;
  images: Array<{ id: string; url: string; altText: string; sortOrder: number }>;
  comments?: CommunityComment[];
  createdAt?: string;
  updatedAt?: string;
};
export type CommunityProfileDetail = CommunityProfile & {
  bio: string | null;
  city: string | null;
  followerCount: number;
  followingCount: number;
  contributionCount: number;
  questions: Array<{ id: string; title: string; slug: string }>;
  answers: Array<{ id: string; body: string; question: { title: string; slug: string } }>;
  experiences: CommunityExperience[];
  collections: Array<{ id: string; title: string; slug: string; itemCount: number }>;
  concepts: Array<{ id: string; title: string; slug: string }>;
};
export type PublicCollection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  itemCount: number;
  visibility?: string;
  owner: { profile: CommunityProfile | null };
  items: Array<{
    id: string;
    entityType: string;
    entityId: string;
    sortOrder: number;
    content: {
      title: string;
      summary: string | null;
      href: string;
      imageUrl: string | null;
    } | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
};


/** No placeholder feed: an unreachable API yields an honest empty state, never fabricated content. */
export const fallbackFeed: CommunityFeedItem[] = [];

export const fallbackTopics: CommunityTopic[] = [
  {
    id: 't1',
    name: 'Doğum Günü',
    slug: 'dogum-gunu',
    description: 'Doğum günü planlama topluluğu.',
    kind: 'EVENT_TYPE',
    featured: true,
    contentCount: 9,
    followerCount: 128,
  },
  {
    id: 't2',
    name: 'Evde Kutlama',
    slug: 'evde-kutlama',
    description: 'Ev ortamına uygun planlar.',
    kind: 'FORMAT',
    featured: true,
    contentCount: 5,
    followerCount: 74,
  },
  {
    id: 't3',
    name: 'Safari',
    slug: 'safari',
    description: 'Doğal tonlarda safari teması.',
    kind: 'THEME',
    featured: true,
    contentCount: 3,
    followerCount: 46,
  },
  {
    id: 't4',
    name: 'Düşük Bütçe',
    slug: 'dusuk-butce',
    description: 'Bütçe dostu alternatifler.',
    kind: 'BUDGET',
    featured: true,
    contentCount: 4,
    followerCount: 91,
  },
  {
    id: 't5',
    name: 'Oyunlar',
    slug: 'oyunlar',
    description: 'Yaşa uygun oyunlar.',
    kind: 'GENERAL',
    featured: false,
    contentCount: 2,
    followerCount: 32,
  },
];

async function api<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiUrl}/v1/community${path}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getFeed(tab = 'personalized', pageSize = 30) {
  return (
    await api<{ data: CommunityFeedItem[] }>(
      `/feed?tab=${encodeURIComponent(tab)}&pageSize=${Math.min(pageSize, 50)}`,
      { data: fallbackFeed },
    )
  ).data;
}
export async function getTopics(pageSize = 30) {
  return api<CommunityTopic[]>(`/topics?pageSize=${Math.min(pageSize, 50)}`, fallbackTopics);
}
export async function getEventTypes() {
  return api<Array<{ id: string; name: string; slug: string }>>('/event-types', []);
}
export async function getOverview() {
  return api('/overview', {
    members: 4,
    questions: 3,
    discussions: 2,
    inspirations: 1,
    topics: 12,
  });
}
export type ListMeta = { page: number; pageSize: number; total: number; pageCount?: number };
type Listed<T> = { data: T[]; meta?: ListMeta };

export type QuestionTab = 'popular' | 'new' | 'unanswered' | 'following';

/** Questions with pagination metadata (public tabs only). */
export async function getQuestionsPage(
  options: { tab?: Exclude<QuestionTab, 'following'>; page?: number; pageSize?: number } = {},
) {
  const params = new URLSearchParams({
    pageSize: String(Math.min(options.pageSize ?? 20, 50)),
    page: String(options.page ?? 1),
  });
  if (options.tab) params.set('tab', options.tab);
  return api<Listed<CommunityQuestion>>(`/questions?${params.toString()}`, { data: [] });
}
export async function getDiscussionsPage(options: { page?: number; pageSize?: number } = {}) {
  const params = new URLSearchParams({
    pageSize: String(Math.min(options.pageSize ?? 20, 50)),
    page: String(options.page ?? 1),
  });
  return api<Listed<CommunityDiscussion>>(`/discussions?${params.toString()}`, { data: [] });
}
export async function getQuestions(
  options: { tab?: QuestionTab; concept?: string; pageSize?: number } = {},
) {
  const params = new URLSearchParams({ pageSize: String(Math.min(options.pageSize ?? 30, 50)) });
  if (options.tab && options.tab !== 'following') params.set('tab', options.tab);
  if (options.concept) params.set('concept', options.concept);
  if (options.tab === 'following') {
    try {
      return (
        await memberApi<{ data: CommunityQuestion[] }>(
          `/questions/following/mine?${params.toString()}`,
        )
      ).data;
    } catch {
      return [];
    }
  }
  return (await api<{ data: CommunityQuestion[] }>(`/questions?${params.toString()}`, { data: [] }))
    .data;
}
export async function getQuestion(slug: string) {
  return api<CommunityQuestion | null>(`/questions/${encodeURIComponent(slug)}`, null);
}
export async function getDiscussions(pageSize = 30) {
  return (
    await api<{ data: CommunityDiscussion[] }>(`/discussions?pageSize=${Math.min(pageSize, 50)}`, {
      data: [],
    })
  ).data;
}
export async function getDiscussion(slug: string) {
  return api<CommunityDiscussion | null>(`/discussions/${encodeURIComponent(slug)}`, null);
}
export async function getPoll(slug: string) {
  return api<CommunityPoll | null>(`/polls/${encodeURIComponent(slug)}`, null);
}
export async function getGuide(slug: string) {
  return api<CommunityGuide | null>(`/guides/${encodeURIComponent(slug)}`, null);
}
export type ExperienceFilters = {
  eventType?: string | undefined;
  venue?: string | undefined;
  concept?: string | undefined;
  sort?: 'popular' | 'new' | undefined;
  q?: string | undefined;
  pageSize?: number | undefined;
  page?: number | undefined;
};
/** Experiences with pagination metadata. */
export async function getExperiencesPage(filters: ExperienceFilters = {}) {
  const params = new URLSearchParams({
    pageSize: String(Math.min(filters.pageSize ?? 24, 50)),
    page: String(filters.page ?? 1),
  });
  if (filters.eventType) params.set('eventType', filters.eventType);
  if (filters.venue) params.set('venue', filters.venue);
  if (filters.concept) params.set('concept', filters.concept);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.q) params.set('q', filters.q);
  return api<Listed<CommunityExperience>>(`/experiences?${params.toString()}`, { data: [] });
}
export async function getExperiences(filters: ExperienceFilters = {}) {
  const params = new URLSearchParams({ pageSize: String(filters.pageSize ?? 30) });
  if (filters.eventType) params.set('eventType', filters.eventType);
  if (filters.venue) params.set('venue', filters.venue);
  if (filters.concept) params.set('concept', filters.concept);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.q) params.set('q', filters.q);
  return (
    await api<{ data: CommunityExperience[] }>(`/experiences?${params.toString()}`, { data: [] })
  ).data;
}

export type SearchResult = {
  concepts: ConceptSummary[];
  experiences: CommunityExperience[];
  questions: CommunityQuestion[];
  guides: CommunityGuide[];
  topics: CommunityTopic[];
};
export async function searchAll(q: string): Promise<SearchResult> {
  const empty: SearchResult = {
    concepts: [],
    experiences: [],
    questions: [],
    guides: [],
    topics: [],
  };
  if (!q.trim()) return empty;
  const result = await api<{ data: SearchResult }>(
    `/search/all?q=${encodeURIComponent(q)}&pageSize=12`,
    { data: empty },
  );
  return { ...empty, ...result.data };
}

export async function getSavedItems() {
  try {
    return await memberApi<SavedItem[]>('/saves/mine');
  } catch {
    return [];
  }
}
export async function getMyCollections() {
  try {
    return await memberApi<MemberCollection[]>('/collections/mine');
  } catch {
    return [];
  }
}
export async function getExperience(slug: string) {
  return api<CommunityExperience | null>(`/experiences/${encodeURIComponent(slug)}`, null);
}
export const getStories = getExperiences;
export const getStory = getExperience;
export type TopicItem = {
  id: string;
  type: CommunityContentType;
  meta?: string | null;
  title: string;
  summary: string | null;
  href: string;
  imageUrl: string | null;
  updatedAt?: string | null;
};

export async function getTopic(slug: string) {
  return api<
    | (CommunityTopic & {
        contentLinks: Array<{ id: string; contentType: string; contentId: string }>;
        /** Hydrated content behind the topic, newest first (added by the API topic endpoint). */
        items?: TopicItem[];
      })
    | null
  >(`/topics/${encodeURIComponent(slug)}`, null);
}
export async function getProfile(username: string) {
  return api<CommunityProfileDetail | null>(`/profiles/${encodeURIComponent(username)}`, null);
}
export async function getPublicCollection(slug: string) {
  return api<PublicCollection | null>(`/collections/public/${encodeURIComponent(slug)}`, null);
}
export async function getPublicCollections(pageSize = 6) {
  return (
    await api<{ data: PublicCollection[] }>(
      `/collections/public?pageSize=${Math.min(pageSize, 50)}`,
      { data: [] },
    )
  ).data;
}
