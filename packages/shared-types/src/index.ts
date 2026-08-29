export type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ContentStatus;
  conceptCount: number;
  updatedAt?: string;
}

export interface ConceptSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  experienceCount: number;
  questionCount: number;
  saveCount: number;
  commentCount: number;
  reactionCount?: number;
  featured?: boolean;
  publishedAt?: string | null;
  updatedAt?: string;
  category: Pick<CategorySummary, 'id' | 'name' | 'slug'>;
}

export type ConceptSort = 'popular' | 'new' | 'saved';

export interface SeoOverride {
  title: string;
  description: string;
  canonicalUrl: string | null;
  robots: 'INDEX_FOLLOW' | 'NOINDEX_FOLLOW' | 'NOINDEX_NOFOLLOW';
}

export interface ConceptDetail extends ConceptSummary {
  /** Editor-managed metadata override (`seo_metadata`), null when none exists. */
  seo?: SeoOverride | null;
  description: string;
  introduction: string | null;
  colorPalette: Array<{ name: string; hex: string }> | null;
  decorationIdeas: string | null;
  tableSetup: string | null;
  balloonIdeas: string | null;
  cakeIdeas: string | null;
  venueSuggestions: string | null;
  practicalTips: string | null;
  alternatives: string | null;
  faq: Array<{ question: string; answer: string }> | null;
  budgetMin: string | null;
  budgetMax: string | null;
  currency: string;
  publishedAt: string | null;
  updatedAt: string;
  author?: { id: string; profile: CommunityAuthor | null } | null;
  images?: Array<{ id: string; url: string; altText: string; sortOrder: number }>;
  experiences?: ExperienceSummary[];
  questions?: ContextQuestionSummary[];
  comments?: CommunityCommentSummary[];
}

export interface ExperienceSummary {
  id: string;
  title: string;
  slug: string;
  body: string;
  summary: string | null;
  heroImageUrl: string | null;
  city: string | null;
  venueType: string | null;
  guestCount: number | null;
  ageLabel: string | null;
  budgetLabel: string | null;
  themeVariation: string | null;
  colors: string[];
  reactionCount: number;
  commentCount: number;
  saveCount: number;
  indexability: string;
  featured: boolean;
  author: {
    profile: { displayName: string; username: string | null; avatarUrl?: string | null } | null;
  };
  eventType?: { name: string; slug: string } | null;
  concept?: { id?: string; title: string; slug: string; heroImageUrl?: string | null } | null;
  images: Array<{ id: string; url: string; altText: string; sortOrder: number }>;
}

export interface ContextQuestionSummary {
  id: string;
  title: string;
  slug: string;
  body: string;
  answerCount: number;
  reactionCount: number;
  author: { profile: { displayName: string; username: string | null } | null };
  images?: Array<{ id: string; url: string; altText: string; sortOrder: number }>;
}

export interface CommunityCommentSummary {
  id: string;
  body: string;
  reactionCount: number;
  author: { profile: { displayName: string; username: string | null } | null };
  replies: CommunityCommentSummary[];
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
}

export type CommunityContentType =
  | 'INSPIRATION'
  | 'QUESTION'
  | 'DISCUSSION'
  | 'EVENT_EXPERIENCE'
  | 'POLL'
  | 'GUIDE';

export type ProfileKind = 'MEMBER' | 'EDITOR';

export interface CommunityAuthor {
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  /** EDITOR = public editorial author (`/editor/<username>`); MEMBER = community contributor. */
  kind?: ProfileKind;
  jobTitle?: string | null;
  editorActive?: boolean;
  isPublic?: boolean;
}

/** Public editor profile as served by `GET /v1/editors/:username`. */
export interface EditorProfile {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  longBio: string | null;
  jobTitle: string | null;
  expertise: string[];
  socialLinks: Record<string, string> | null;
  websiteUrl: string | null;
  city: string | null;
  kind: ProfileKind;
  editorActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  memberSince: string;
  lastPublishedAt: string | null;
  concepts: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string;
    heroImageUrl: string | null;
    heroImageAlt: string | null;
    publishedAt: string | null;
    updatedAt: string;
    category: { name: string; slug: string };
  }>;
  guides: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string;
    publishedAt: string | null;
    updatedAt: string;
  }>;
}

export interface EditorSummary {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  bio: string | null;
  expertise: string[];
  updatedAt: string;
  conceptCount: number;
  guideCount: number;
}

export interface CommunityFeedItem {
  id: string;
  type: CommunityContentType;
  slug: string;
  title: string;
  summary: string;
  href: string;
  imageUrl?: string | null;
  author: CommunityAuthor | null;
  publishedAt: string;
  featured: boolean;
  reactionCount: number;
  responseCount: number;
  saveCount: number;
  score?: number;
}

export interface CommunityTopic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  kind: 'EVENT_TYPE' | 'THEME' | 'AGE' | 'COLOR' | 'BUDGET' | 'FORMAT' | 'GENERAL';
  featured: boolean;
  contentCount: number;
  followerCount: number;
  updatedAt?: string;
  /** Public content behind the topic per type (`INSPIRATION`, `QUESTION`, …). */
  contentCounts?: Record<string, number>;
  /** Distinct images the hub can show (detail endpoint only). */
  imageCount?: number;
}

export interface MemberSummary {
  id: string;
  email: string;
  roles: string[];
  profile: CommunityAuthor | null;
  unreadNotifications: number;
  savedCount: number;
  collectionCount: number;
}

export interface ResolvedContent {
  type: CommunityContentType;
  title: string;
  summary: string | null;
  href: string;
  imageUrl: string | null;
  meta: string | null;
}

export interface SavedItem {
  id: string;
  contentType: CommunityContentType;
  contentId: string;
  savedAt: string;
  content: ResolvedContent;
}

export interface InteractionState {
  saved: boolean;
  liked: boolean;
  following: boolean;
  collectionIds: string[];
}

export type CollectionVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

export interface MemberCollection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  itemCount: number;
  visibility: CollectionVisibility;
  owner: { profile: CommunityAuthor | null };
  items: Array<{
    id: string;
    entityType: string;
    entityId: string;
    sortOrder: number;
    content: ResolvedContent | null;
  }>;
}
