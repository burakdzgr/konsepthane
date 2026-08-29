import type {
  ButtonHTMLAttributes,
  ElementType,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { clsx } from 'clsx';
import { Icon } from './icons';

export { Icon } from './icons';
export { TextArea, TextInput } from './fields';
export type { IconName } from './icons';

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={clsx('btn btn-primary', className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx('field', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx('field', className)} {...props}>
      {children}
    </select>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('surface', className)} {...props} />;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('chip chip-accent', className)}>{children}</span>;
}

export function Avatar({ name, src }: { name: string; src?: string | undefined }) {
  return src ? (
    <img className="avatar" src={src} alt={name} width={40} height={40} loading="lazy" />
  ) : (
    <span aria-label={name} className="avatar avatar-fallback">
      {name.slice(0, 1).toLocaleUpperCase('tr-TR')}
    </span>
  );
}

export function Breadcrumb({
  items,
  label = 'Sayfa yolu',
}: {
  items: Array<{ label: string; href?: string }>;
  label?: string;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <a className="hover:text-[var(--accent-strong)]" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ConceptCard({
  title,
  summary,
  href,
  imageUrl,
  imageAlt,
  meta,
  experienceCount,
  questionCount,
  saveCount,
  action,
  labels = { tried: (n) => `${n} denedi`, questions: (n) => `${n} soru`, save: 'içeriğini kaydet' },
  LinkComponent: A = 'a',
  ImageComponent: Img = 'img',
  imageSizes,
}: {
  title: string;
  summary: string;
  href: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  meta?: string;
  experienceCount?: number;
  questionCount?: number;
  saveCount?: number;
  /** Optional save control rendered in the card corner (e.g. a server-action form). */
  action?: ReactNode;
  labels?: {
    tried: (n: number) => string;
    questions: (n: number) => string;
    save: string;
  };
  /** Framework link (e.g. `next/link`) so card links prefetch; defaults to a plain anchor. */
  LinkComponent?: ElementType;
  /** Framework image (e.g. a `next/image` wrapper); defaults to a plain `<img>`. */
  ImageComponent?: ElementType;
  imageSizes?: string;
}) {
  return (
    <article className="concept-card tile group">
      <A href={href} className="tile-media" aria-label={title}>
        <div className="concept-card-image tile-image img-frame">
          {imageUrl && (
            <Img src={imageUrl} alt={imageAlt ?? title} loading="lazy" sizes={imageSizes} />
          )}
        </div>
        {meta && <span className="tile-tag">{meta}</span>}
      </A>
      <div className="tile-action">
        {action ?? (
          <a
            href={`/giris?next=${encodeURIComponent(href)}`}
            aria-label={`${title} ${labels.save}`}
            className="save-toggle"
          >
            <Icon name="bookmark" size={18} />
          </a>
        )}
      </div>
      <div className="tile-body">
        <A href={href} className="block">
          <h3 className="tile-title">{title}</h3>
          <p className="tile-summary">{summary}</p>
        </A>
        {experienceCount || questionCount || saveCount ? (
          <div className="tile-stats">
            {experienceCount ? (
              <span>
                <Icon name="users" size={15} /> {labels.tried(experienceCount)}
              </span>
            ) : null}
            {questionCount ? (
              <span>
                <Icon name="help" size={15} /> {labels.questions(questionCount)}
              </span>
            ) : null}
            {saveCount ? (
              <span>
                <Icon name="bookmark" size={15} /> {saveCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function CollectionCard({
  title,
  description,
  href,
  ownerName,
  itemCount,
  coverImageUrl,
  previewImages,
  LinkComponent: A = 'a',
  ImageComponent: Img = 'img',
}: {
  title: string;
  description?: string | null;
  href: string;
  ownerName: string;
  itemCount: number;
  coverImageUrl?: string | null;
  previewImages?: string[];
  LinkComponent?: ElementType;
  ImageComponent?: ElementType;
}) {
  const images = [coverImageUrl, ...(previewImages ?? [])].filter(Boolean).slice(0, 3) as string[];
  return (
    <article className="collection-card tile group">
      <A href={href} className="block">
        <div className="collection-collage">
          {(images.length ? images : ['/placeholders/teddy-concept.svg']).map((src, index) => (
            <span key={`${src}-${index}`} className="img-frame">
              <Img src={src} alt="" loading="lazy" sizes="(max-width: 640px) 50vw, 200px" />
            </span>
          ))}
        </div>
        <div className="tile-body">
          <p className="eyebrow">
            <Icon name="grid" size={14} /> {itemCount} kayıtlı fikir
          </p>
          <h3 className="tile-title">{title}</h3>
          {description && <p className="tile-summary">{description}</p>}
          <p className="tile-owner">{ownerName}</p>
        </div>
      </A>
    </article>
  );
}

export function ExperienceCard({
  title,
  summary,
  href,
  imageUrl,
  imageAlt = '',
  authorName,
  authorAvatarUrl,
  meta,
  reactions = 0,
  comments = 0,
  action,
  badge = 'Gerçek kutlama',
  LinkComponent: A = 'a',
  ImageComponent: Img = 'img',
  imageSizes,
}: {
  title: string;
  summary: string;
  href: string;
  imageUrl: string;
  imageAlt?: string;
  authorName: string;
  authorAvatarUrl?: string | null | undefined;
  meta: string;
  reactions?: number;
  comments?: number;
  action?: ReactNode;
  badge?: string;
  LinkComponent?: ElementType;
  ImageComponent?: ElementType;
  imageSizes?: string;
}) {
  return (
    <article className="experience-card party-tile group">
      <A href={href} className="party-tile-media img-frame" aria-label={title}>
        <Img src={imageUrl} alt={imageAlt ?? title} loading="lazy" sizes={imageSizes} />
        <span className="party-tile-badge">
          <Icon name="camera" size={13} /> {badge}
        </span>
        <span className="party-tile-overlay">
          <strong>{title}</strong>
          {meta && <small>{meta}</small>}
        </span>
      </A>
      {action && <div className="experience-card-action tile-action">{action}</div>}
      <div className="party-tile-footer">
        <span className="party-tile-author">
          <Avatar name={authorName} src={authorAvatarUrl ?? undefined} />
          <span>{authorName}</span>
        </span>
        <span className="party-tile-stats">
          {reactions ? (
            <span>
              <Icon name="heart" size={15} /> {reactions}
            </span>
          ) : null}
          {comments ? (
            <span>
              <Icon name="comment" size={15} /> {comments}
            </span>
          ) : null}
        </span>
      </div>
      <p className="sr-only">{summary}</p>
    </article>
  );
}

export function ContributionBadge({ type }: { type: 'comment' | 'question' | 'experience' }) {
  return (
    <Badge
      className={clsx(
        type === 'comment' && 'chip-stone',
        type === 'question' && 'chip-sky',
        type === 'experience' && 'chip-mint',
      )}
    >
      {type === 'comment' ? 'Yorum' : type === 'question' ? 'Soru' : 'Deneyim'}
    </Badge>
  );
}

export function ImageCard({
  src,
  alt,
  caption,
  ImageComponent: Img = 'img',
}: {
  src: string;
  alt: string;
  caption?: string;
  ImageComponent?: ElementType;
}) {
  return (
    <figure className="overflow-hidden rounded-3xl bg-white">
      <span className="img-frame block aspect-[4/3]">
        <Img className="w-full object-cover" src={src} alt={alt} loading="lazy" />
      </span>
      {caption && <figcaption className="p-3 text-sm text-[var(--muted)]">{caption}</figcaption>}
    </figure>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon name="sparkle" size={22} />
      </span>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-[var(--muted)]">{description}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={clsx('animate-pulse rounded-xl bg-stone-200', className)} />
  );
}

export function Tabs({
  items,
  active,
}: {
  items: Array<{ key: string; label: string; href: string }>;
  active: string;
}) {
  return (
    <div role="tablist" className="discovery-tabs">
      {items.map((item) => (
        <a
          key={item.key}
          role="tab"
          aria-selected={item.key === active}
          href={item.href}
          className={clsx(item.key === active && 'is-active')}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

export function Modal({
  title,
  children,
  open,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <Card className="max-h-[90vh] w-full max-w-xl overflow-auto p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
      </Card>
    </div>
  );
}

export function Drawer({
  title,
  children,
  open,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
}) {
  if (!open) return null;
  return (
    <aside
      aria-label={title}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-auto bg-white p-6 shadow-2xl"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </aside>
  );
}

export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-full border px-4 py-2 text-sm font-semibold">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-48 rounded-2xl border bg-white p-2 shadow-xl">
        {children}
      </div>
    </details>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm text-white shadow-xl"
    >
      {children}
    </div>
  );
}

export type CommunityContentKind =
  | 'INSPIRATION'
  | 'QUESTION'
  | 'DISCUSSION'
  | 'EVENT_EXPERIENCE'
  | 'POLL'
  | 'GUIDE';

const contentTypeLabels: Record<CommunityContentKind, string> = {
  INSPIRATION: 'İlham',
  QUESTION: 'Soru',
  DISCUSSION: 'Tartışma',
  EVENT_EXPERIENCE: 'Deneyim',
  POLL: 'Anket',
  GUIDE: 'Rehber',
};

export function ContentTypeBadge({ type }: { type: CommunityContentKind }) {
  return (
    <Badge
      className={clsx(
        type === 'QUESTION' && 'chip-sky',
        type === 'DISCUSSION' && 'chip-lavender',
        type === 'EVENT_EXPERIENCE' && 'chip-mint',
        type === 'POLL' && 'chip-butter',
        type === 'GUIDE' && 'chip-stone',
      )}
    >
      {contentTypeLabels[type]}
    </Badge>
  );
}

export function TopicChip({ label, href, count }: { label: string; href: string; count?: number }) {
  return (
    <a href={href} className="topic-chip">
      <span aria-hidden="true">#</span>
      {label}
      {typeof count === 'number' && <span className="text-xs text-[var(--muted)]">{count}</span>}
    </a>
  );
}

export function UserMiniProfile({
  name,
  username,
  avatarUrl,
  meta,
  href,
}: {
  name: string;
  username?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  meta?: string | undefined;
  /** Explicit (locale-prefixed) profile link; overrides the default `/uye/<username>`. */
  href?: string | null | undefined;
}) {
  const content = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} src={avatarUrl ?? undefined} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {meta && <span className="block truncate text-xs text-[var(--muted)]">{meta}</span>}
      </span>
    </span>
  );
  const link = href ?? (username ? `/uye/${username}` : null);
  return link ? <a href={link}>{content}</a> : content;
}

export function ReactionButton({
  count = 0,
  active = false,
}: {
  count?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx('community-action', active && 'is-active')}
    >
      <Icon name={active ? 'heart-filled' : 'heart'} size={17} /> <span>{count}</span>
    </button>
  );
}

export function SaveButton({ count = 0, active = false }: { count?: number; active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx('community-action', active && 'is-active')}
    >
      <Icon name={active ? 'bookmark-filled' : 'bookmark'} size={17} />{' '}
      <span>{count || 'Kaydet'}</span>
    </button>
  );
}

export function FollowButton({ active = false }: { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className="min-h-10 rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--accent-strong)]"
    >
      {active ? 'Takip ediliyor' : 'Takip et'}
    </button>
  );
}

export function ReportButton() {
  return (
    <button type="button" className="community-action ml-auto" aria-label="İçeriği bildir">
      <Icon name="flag" size={16} />
    </button>
  );
}

export function CommunityActionBar({
  reactions = 0,
  responses = 0,
  saves = 0,
  responseLabel = 'Yorum',
}: {
  reactions?: number | undefined;
  responses?: number | undefined;
  saves?: number | undefined;
  responseLabel?: string | undefined;
}) {
  return (
    <div className="mt-5 flex items-center gap-1 border-t border-[var(--line)] pt-3">
      <ReactionButton count={reactions} />
      <button type="button" className="community-action">
        <Icon name="comment" size={17} />{' '}
        <span>
          {responses} {responseLabel}
        </span>
      </button>
      <SaveButton count={saves} />
      <ReportButton />
    </div>
  );
}

export function FeedTabs({ active = 'personalized' }: { active?: string }) {
  return (
    <Tabs
      active={active}
      items={[
        { key: 'personalized', label: 'Sana özel', href: '/?tab=personalized' },
        { key: 'new', label: 'Yeni', href: '/?tab=new' },
        { key: 'popular', label: 'Popüler', href: '/?tab=popular' },
        { key: 'following', label: 'Takip ettiklerin', href: '/?tab=following' },
      ]}
    />
  );
}

type CommunityCardProps = {
  title: string;
  summary: string;
  href: string;
  authorName?: string | undefined;
  username?: string | null | undefined;
  imageUrl?: string | null | undefined;
  type: CommunityContentKind;
  reactions?: number | undefined;
  responses?: number | undefined;
  saves?: number | undefined;
  meta?: string | undefined;
  LinkComponent?: ElementType;
  ImageComponent?: ElementType;
};

export function CommunityCard({
  title,
  summary,
  href,
  authorName = 'Konsepthane topluluğu',
  username,
  imageUrl,
  type,
  reactions,
  responses,
  saves,
  meta,
  LinkComponent: A = 'a',
  ImageComponent: Img = 'img',
}: CommunityCardProps) {
  return (
    <Card className="overflow-hidden">
      <article>
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <UserMiniProfile
              name={authorName}
              username={username}
              meta={meta ?? 'Topluluk paylaşımı'}
            />
            <ContentTypeBadge type={type} />
          </div>
          <A href={href} className="group mt-5 block">
            <h2 className="font-display text-[1.35rem] font-semibold leading-tight tracking-[-.02em] group-hover:text-[var(--accent-strong)]">
              {title}
            </h2>
            <p className="mt-2 line-clamp-3 text-[15px] leading-6 text-[var(--muted)]">{summary}</p>
          </A>
          {imageUrl && (
            <A
              href={href}
              aria-label={title}
              className="img-frame mt-4 block aspect-[16/9] overflow-hidden rounded-2xl bg-stone-100"
            >
              <Img src={imageUrl} alt="" loading="lazy" sizes="(max-width: 768px) 100vw, 720px" />
            </A>
          )}
          <CommunityActionBar
            reactions={reactions}
            responses={responses}
            saves={saves}
            responseLabel={type === 'QUESTION' ? 'Yanıt' : type === 'POLL' ? 'Oy' : 'Yorum'}
          />
        </div>
      </article>
    </Card>
  );
}

export function QuestionCard(props: Omit<CommunityCardProps, 'type'>) {
  return <CommunityCard {...props} type="QUESTION" />;
}
export function DiscussionCard(props: Omit<CommunityCardProps, 'type'>) {
  return <CommunityCard {...props} type="DISCUSSION" />;
}
export function EventStoryCard(props: Omit<CommunityCardProps, 'type'>) {
  return <CommunityCard {...props} type="EVENT_EXPERIENCE" />;
}

export function PollCard({
  title,
  body,
  href,
  options,
  voteCount = 0,
}: {
  title: string;
  body?: string | null;
  href: string;
  options: Array<{ id: string; label: string; voteCount: number }>;
  voteCount?: number;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <ContentTypeBadge type="POLL" />
      <a href={href}>
        <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      </a>
      {body && <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>}
      <div className="mt-5 space-y-3">
        {options.map((option) => {
          const percent = voteCount ? Math.round((option.voteCount / voteCount) * 100) : 0;
          return (
            <div key={option.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{option.label}</span>
                <span>{percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">{voteCount} oy</p>
    </Card>
  );
}

export function AnswerCard({
  body,
  authorName,
  username,
  helpful = 0,
  accepted = false,
}: {
  body: string;
  authorName: string;
  username?: string | null | undefined;
  helpful?: number;
  accepted?: boolean;
}) {
  return (
    <Card className={clsx('p-5', accepted && 'is-accepted')}>
      <div className="flex items-center justify-between gap-3">
        <UserMiniProfile name={authorName} username={username} meta="Topluluk yanıtı" />
        {accepted && (
          <Badge className="chip-mint">
            <Icon name="check" size={14} /> Kabul edilen yanıt
          </Badge>
        )}
      </div>
      <p className="mt-4 whitespace-pre-line text-[15px] leading-7">{body}</p>
      <button className="btn btn-ghost mt-4" type="button">
        <Icon name="heart" size={16} /> Faydalı · {helpful}
      </button>
    </Card>
  );
}

export type CommentNode = {
  id: string;
  body: string;
  reactionCount?: number;
  author?: {
    profile?: {
      displayName?: string;
      username?: string | null | undefined;
      avatarUrl?: string | null | undefined;
    } | null;
  };
  replies?: CommentNode[];
};
export function CommentThread({
  comments,
  renderReply,
  depth = 0,
}: {
  comments: CommentNode[];
  /** Optional reply control per comment (e.g. a server-action form). */
  renderReply?: ((comment: CommentNode, depth: number) => ReactNode) | undefined;
  depth?: number | undefined;
}) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <UserMiniProfile
            name={comment.author?.profile?.displayName ?? 'Topluluk üyesi'}
            username={comment.author?.profile?.username}
            avatarUrl={comment.author?.profile?.avatarUrl}
          />
          <p className="mt-3 whitespace-pre-line text-sm leading-6">{comment.body}</p>
          {renderReply && depth < 2 ? renderReply(comment, depth) : null}
          {comment.replies?.length ? (
            <div className="mt-4 border-l-2 border-[var(--accent-soft)] pl-4">
              <CommentThread
                comments={comment.replies}
                renderReply={renderReply}
                depth={depth + 1}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CommentComposer({
  placeholder = 'Topluluğa katkını yaz…',
}: {
  placeholder?: string;
}) {
  return (
    <form className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <label className="sr-only" htmlFor="community-comment">
        Yorum
      </label>
      <textarea
        id="community-comment"
        name="body"
        rows={3}
        placeholder={placeholder}
        className="w-full resize-y bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
      />
      <div className="mt-3 flex justify-end">
        <Button type="submit">Gönder</Button>
      </div>
    </form>
  );
}

export function NotificationItem({
  message,
  time,
  unread = false,
}: {
  message: string;
  time: string;
  unread?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex gap-3 rounded-2xl p-4',
        unread ? 'bg-[var(--accent-soft)]' : 'bg-white',
      )}
    >
      <span
        className={clsx('mt-1 size-2 rounded-full', unread ? 'bg-[var(--accent)]' : 'bg-stone-200')}
      />
      <div>
        <p className="text-sm font-medium">{message}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{time}</p>
      </div>
    </div>
  );
}

export function ComposerModal() {
  const choices = [
    [
      'Fikir / İçerik Paylaş',
      'Editörlere uygulanabilir bir içerik önerisi gönder',
      '/olustur?tur=ilham',
    ],
    [
      'Deneyimini Paylaş',
      'Gerçek kutlamanı fotoğraflar ve öğrendiklerinle anlat',
      '/olustur?tur=deneyim',
    ],
    ['Soru sor', 'Topluluktan net bir yanıt iste', '/olustur?tur=soru'],
    ['Tartışma başlat', 'Bir görüşü toplulukla konuş', '/olustur?tur=tartisma'],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map(([title, description, href]) => (
        <a key={href} href={href} className="composer-choice">
          <strong>{title}</strong>
          <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">{description}</span>
        </a>
      ))}
    </div>
  );
}

/**
 * Numbered pagination for hub pages. Every page is a real, crawlable URL; the current page is
 * marked with `aria-current`. Window: first, last, and ±2 around the current page.
 */
export function Pagination({
  page,
  pageCount,
  href,
  labels = { label: 'Sayfalar', previous: 'Önceki', next: 'Sonraki', page: (n) => `Sayfa ${n}` },
  LinkComponent: A = 'a',
}: {
  page: number;
  pageCount: number;
  href: (page: number) => string;
  labels?: { label: string; previous: string; next: string; page: (n: number) => string };
  LinkComponent?: ElementType;
}) {
  if (pageCount <= 1) return null;
  const pages = new Set<number>([1, pageCount, page - 2, page - 1, page, page + 1, page + 2]);
  const ordered = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const items: Array<number | 'gap'> = [];
  ordered.forEach((n, index) => {
    const previous = ordered[index - 1];
    if (previous !== undefined && n - previous > 1) items.push('gap');
    items.push(n);
  });
  return (
    <nav className="pagination" aria-label={labels.label}>
      {page > 1 ? (
        <A href={href(page - 1)} rel="prev" className="pagination-arrow">
          ← {labels.previous}
        </A>
      ) : (
        <span className="pagination-arrow is-disabled" aria-disabled="true">
          ← {labels.previous}
        </span>
      )}
      <ol>
        {items.map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="pagination-gap">
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span aria-current="page" className="is-active">
                  {item}
                </span>
              ) : (
                <A href={href(item)} aria-label={labels.page(item)}>
                  {item}
                </A>
              )}
            </li>
          ),
        )}
      </ol>
      {page < pageCount ? (
        <A href={href(page + 1)} rel="next" className="pagination-arrow">
          {labels.next} →
        </A>
      ) : (
        <span className="pagination-arrow is-disabled" aria-disabled="true">
          {labels.next} →
        </span>
      )}
    </nav>
  );
}
