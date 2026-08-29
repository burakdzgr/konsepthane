import Link from 'next/link';
import type { CommunityAuthor } from '@ilham/shared-types';
import { Avatar, Icon } from '@ilham/ui';
import { authorHref, isEditorAuthor } from '@/lib/editors';
import { getDictionary, type Locale } from '@/lib/i18n';

/**
 * Editorial byline: who wrote this, what they do, how long it takes to read, when it was updated.
 * Editors link to their public profile; content without a named editor is signed by the
 * organisation ("Konsepthane Editörleri") — content origin is always visible.
 */
export function EditorialByline({
  locale,
  author,
  readingMinutes,
  publishedAt,
  updatedAt,
}: {
  locale: Locale;
  author: CommunityAuthor | null | undefined;
  readingMinutes?: number | undefined;
  publishedAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}) {
  const t = getDictionary(locale).author;
  const editor = isEditorAuthor(author) ? author : null;
  const href = authorHref(locale, editor);
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB';
  const format = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  const name = editor?.displayName ?? t.organisation;
  const role = editor ? (editor.jobTitle ?? t.editorTitle) : t.organisationTitle;
  return (
    <div className="editorial-byline">
      <Avatar name={name} src={editor?.avatarUrl ?? undefined} />
      <div className="editorial-byline-body">
        <p className="editorial-byline-name">
          {href ? <Link href={href}>{name}</Link> : <span>{name}</span>}
          <span className="editorial-byline-role">{role}</span>
        </p>
        <p className="editorial-byline-meta">
          {readingMinutes ? <span>{t.readingTime(readingMinutes)}</span> : null}
          {publishedAt ? (
            <span>
              {t.published} {format(publishedAt)}
            </span>
          ) : null}
          {updatedAt && (!publishedAt || updatedAt.slice(0, 10) !== publishedAt.slice(0, 10)) ? (
            <span>
              {t.updated} {format(updatedAt)}
            </span>
          ) : null}
        </p>
      </div>
      {href ? (
        <Link href={href} className="btn btn-ghost editorial-byline-cta">
          {t.viewProfile} <Icon name="arrow-right" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

/** "Yazar hakkında" block at the end of editorial content (only for real editors). */
export function AuthorBox({
  locale,
  author,
  bio,
  expertise,
}: {
  locale: Locale;
  author: CommunityAuthor | null | undefined;
  bio?: string | null | undefined;
  expertise?: string[] | undefined;
}) {
  const t = getDictionary(locale).author;
  if (!isEditorAuthor(author)) return null;
  const href = authorHref(locale, author);
  return (
    <aside className="author-box" aria-labelledby="yazar-hakkinda">
      <p className="section-eyebrow" id="yazar-hakkinda">
        {t.aboutAuthor}
      </p>
      <div className="author-box-body">
        <Avatar name={author.displayName} src={author.avatarUrl ?? undefined} />
        <div>
          <p className="author-box-name">
            {href ? <Link href={href}>{author.displayName}</Link> : author.displayName}
          </p>
          <p className="author-box-role">{author.jobTitle ?? t.editorTitle}</p>
          {bio ? <p className="author-box-bio">{bio}</p> : null}
          {expertise?.length ? (
            <p className="author-box-expertise">
              {t.expertise}: {expertise.join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

/**
 * Attribution for community (UGC) content: "Paylaşan: derya-kaya". Uses displayName/username,
 * never real names, and links only to public member profiles.
 */
export function UgcAttribution({
  locale,
  author,
  verb,
}: {
  locale: Locale;
  author: CommunityAuthor | null | undefined;
  verb: 'shared' | 'asked' | 'answered' | 'started' | 'commented';
}) {
  const t = getDictionary(locale).author;
  const href = authorHref(locale, author);
  const name = author?.displayName ?? t.communityMember;
  return (
    <span className="ugc-attribution">
      {t.verbs[verb]}: {href ? <Link href={href}>{name}</Link> : <span>{name}</span>}
    </span>
  );
}
