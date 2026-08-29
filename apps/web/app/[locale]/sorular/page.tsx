import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, Icon, Pagination, QuestionCard } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { SmartImage } from '@/components/smart-image';
import { getMember, loginHref } from '@/lib/auth';
import { getQuestions, getQuestionsPage, type QuestionTab } from '@/lib/community';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';
import { pageHref, pageMeta, pagedMetadata, parsePage } from '@/lib/pagination';

const QUESTIONS_PAGE_SIZE = 20;

const tabs: QuestionTab[] = ['popular', 'new', 'unanswered', 'following'];

function parseTab(value: string | undefined): QuestionTab {
  return value === 'new' || value === 'unanswered' || value === 'following' ? value : 'popular';
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sayfa?: string; sekme?: string }>;
}): Promise<Metadata> {
  const [{ locale: localeParam }, { sayfa, sekme }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.questions;
  return pagedMetadata(
    locale,
    '/sorular',
    parsePage(sayfa),
    { title: t.title, description: t.metaDescription },
    dictionary.pages.pagination.titleSuffix,
    { filtered: Boolean(sekme && sekme !== 'popular') },
  );
}

export default async function QuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sekme?: string; sayfa?: string }>;
}) {
  const [{ locale: localeParam }, { sekme, sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.questions;
  const p = (path: string) => localePath(locale, path);
  const tab = parseTab(sekme);
  const page = parsePage(sayfa);
  const member = await getMember();
  const tabQuery = new URLSearchParams(tab === 'popular' ? {} : { sekme: tab });
  const listHref = (n: number) => p(pageHref('/sorular', n, tabQuery));
  let questions;
  let meta = pageMeta(undefined, page, QUESTIONS_PAGE_SIZE);
  if (tab === 'following') {
    questions = member ? await getQuestions({ tab }) : [];
  } else {
    const result = await getQuestionsPage({ tab, page, pageSize: QUESTIONS_PAGE_SIZE });
    meta = pageMeta(result.meta, page, QUESTIONS_PAGE_SIZE);
    if (page > 1 && page > meta.pageCount) notFound();
    questions = result.data;
  }
  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.heading}
        description={t.description}
        action={
          <Link href={p('/olustur?tur=soru')} className="btn btn-primary">
            <Icon name="help" size={16} /> {t.ask}
          </Link>
        }
      />
      <div className="wrap reading py-8">
        <div className="discovery-tabs" aria-label={t.tabsLabel}>
          {tabs.map((key) => (
            <Link
              key={key}
              href={key === 'popular' ? p('/sorular') : p(`/sorular?sekme=${key}`)}
              className={tab === key ? 'is-active' : undefined}
              aria-current={tab === key ? 'page' : undefined}
            >
              {t.tabs[key]}
            </Link>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {tab === 'following' && !member ? (
            <div className="surface p-6 text-sm leading-6">
              {t.loginToSeeFollowing}{' '}
              <Link
                href={loginHref(p('/sorular?sekme=following'))}
                className="font-semibold text-[var(--accent-strong)]"
              >
                {t.login} →
              </Link>
            </div>
          ) : questions.length ? (
            questions.map((item) => (
              <QuestionCard
                LinkComponent={Link}
                ImageComponent={SmartImage}
                key={item.id}
                title={item.title}
                summary={item.body}
                imageUrl={item.images?.[0]?.url}
                href={p(`/soru/${item.slug}`)}
                authorName={item.author.profile?.displayName}
                username={item.author.profile?.username}
                reactions={item.reactionCount}
                responses={item.answerCount}
                saves={item.saveCount}
                meta={
                  item.concept
                    ? t.related(item.concept.title)
                    : item.status === 'RESOLVED'
                      ? t.resolved
                      : item.answerCount
                        ? t.answered
                        : t.waiting
                }
              />
            ))
          ) : (
            <EmptyState
              title={
                tab === 'unanswered'
                  ? t.emptyUnanswered
                  : tab === 'following'
                    ? t.emptyFollowing
                    : t.empty
              }
              description={tab === 'following' ? t.emptyFollowingText : t.emptyText}
            />
          )}
        </div>
        {tab !== 'following' && (
          <Pagination
            page={meta.page}
            pageCount={meta.pageCount}
            href={listHref}
            labels={dictionary.pages.pagination}
            LinkComponent={Link}
          />
        )}
      </div>
    </>
  );
}
