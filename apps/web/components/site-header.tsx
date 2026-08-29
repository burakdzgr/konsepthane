import Link from 'next/link';
import { Icon } from '@ilham/ui';
import {
  HeaderAccount,
  LocaleMenu,
  MobileNavAccount,
  SavedLink,
} from '@/components/header-account';
import { MobileMenu } from '@/components/mobile-menu';
import { logoutAction } from '@/lib/actions';
import { getTopics } from '@/lib/community';
import { getDictionary, localePath, type Locale } from '@/lib/i18n';
import { topicHref } from '@/lib/topics';

const topicDots = [
  'var(--accent)',
  '#e9a23b',
  '#5aa982',
  '#c48bd8',
  '#5b8fd6',
  '#b5885a',
  '#7c9a4b',
  '#a0714a',
  '#9a9a9a',
  '#e57d95',
  '#e2606c',
  '#7aa0b8',
];

/**
 * The header reads no cookies or request headers: everything personal (account menu, saved
 * badge, mobile drawer account section) is a client island fed by `/api/session`, so every page
 * that embeds this header can still be rendered statically.
 */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const topics = await getTopics();
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const primaryNav: Array<[string, string, boolean]> = [
    [t.nav.birthday, p('/kategori/dogum-gunu'), false],
    [t.nav.babyShower, p('/kategori/baby-shower'), false],
    [t.nav.engagement, p('/kategori/nisan'), false],
    [t.nav.henna, p('/kategori/kina'), false],
    [t.nav.ideas, p('/fikirler'), false],
    [t.nav.experiences, p('/deneyimler'), true],
    [t.nav.questions, p('/sorular'), true],
  ];
  /** Desktop nav: the four event categories stay visible; everything else lives under "Keşfet". */
  const eventNav = primaryNav.slice(0, 4);
  const discoverNav: Array<[string, string]> = [
    [t.nav.ideas, p('/fikirler')],
    [t.nav.blog, p('/blog')],
    [t.nav.experiences, p('/deneyimler')],
    [t.nav.questions, p('/sorular')],
    [t.nav.navDiscussions, p('/tartismalar')],
    [t.nav.navTopics, p('/konu')],
    [t.nav.discoverAll, p('/kesfet')],
  ];
  const topicLinks = t.nav.topics.map(([label, query], index) => ({
    label,
    href: topicHref(locale, query, topics),
    dot: topicDots[index % topicDots.length] ?? 'var(--accent)',
  }));
  const accountLabels = {
    login: t.nav.login,
    accountMenu: t.nav.accountMenu,
    profile: t.nav.profile,
    accountSettings: t.nav.accountSettings,
    savedAndBoards: t.nav.savedAndBoards,
    notifications: t.nav.notifications,
    createPost: t.nav.createPost,
    logout: t.nav.logout,
    saved: t.nav.saved,
    language: t.site.language,
  };
  return (
    <header className="site-header">
      <div className="wrap">
        <div className="site-header-row">
          <Link href={p('/')} className="brand" aria-label={t.nav.home}>
            <img
              src="/brand/konsepthane-logo.png?v=2"
              alt="Konsepthane"
              width="1901"
              height="509"
              fetchPriority="high"
              decoding="async"
            />
          </Link>
          <nav aria-label={t.nav.home} className="primary-nav">
            {eventNav.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
            <details className="member-menu explore-menu">
              <summary>
                {t.nav.discover} <Icon name="chevron-down" size={14} />
              </summary>
              <div className="member-menu-panel">
                {discoverNav.map(([label, href]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>
          <form action={p('/kesfet')} className="header-search" role="search">
            <Icon name="search" size={17} />
            <label htmlFor="site-search" className="sr-only">
              {t.nav.searchLabel}
            </label>
            <input id="site-search" name="q" type="search" placeholder={t.nav.searchPlaceholder} />
          </form>
          <nav aria-label={t.nav.accountMenu} className="header-actions">
            <Link
              href={p('/kesfet')}
              aria-label={t.nav.search}
              className="header-icon-link header-search-icon"
            >
              <Icon name="search" />
            </Link>
            <SavedLink locale={locale} label={t.nav.saved} />
            <span className="header-divider" aria-hidden="true" />
            <LocaleMenu locale={locale} label={t.site.language} />
            <HeaderAccount locale={locale} labels={accountLabels} logout={logoutAction} />
            <Link
              href={p('/olustur')}
              className="btn btn-primary header-share"
              aria-label={t.nav.share}
            >
              <Icon name="plus" size={16} />{' '}
              <span className="header-share-label">{t.nav.share}</span>
            </Link>
            <MobileMenu
              locale={locale}
              labels={{
                menu: t.nav.menu,
                close: t.nav.closeMenu,
                browse: t.nav.menuBrowse,
                community: t.nav.menuCommunity,
                account: t.nav.menuAccount,
                language: t.nav.menuLanguage,
                login: t.nav.login,
                share: t.nav.share,
                logout: t.nav.logout,
                profile: t.nav.profile,
                savedAndBoards: t.nav.savedAndBoards,
                notifications: t.nav.notifications,
                topics: t.nav.menuTopics,
              }}
              primary={primaryNav.map(([label, href, community]) => ({ label, href, community }))}
              topics={topicLinks}
              logout={logoutAction}
            />
          </nav>
        </div>
      </div>
      <div className="topic-strip">
        <div className="topic-strip-inner wrap">
          <span className="topic-sparkle topic-sparkle-left" aria-hidden="true">
            ✦
          </span>
          <span className="topic-strip-label">{t.nav.popular}</span>
          {topicLinks.map((topic) => (
            <Link
              key={topic.href + topic.label}
              href={topic.href}
              className="topic-chip"
              style={{ ['--dot' as string]: topic.dot }}
            >
              <i aria-hidden="true" />
              {topic.label}
            </Link>
          ))}
          <span className="topic-sparkle topic-sparkle-right" aria-hidden="true">
            ✦
          </span>
        </div>
      </div>
    </header>
  );
}

export function MobileNav({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  return (
    <nav aria-label={t.nav.home} className="mobile-bottom-nav">
      <Link href={p('/')}>
        <Icon name="home" size={22} />
        <span>{t.nav.home}</span>
      </Link>
      <Link href={p('/kesfet')}>
        <Icon name="compass" size={22} />
        <span>{t.nav.explore}</span>
      </Link>
      <Link href={p('/olustur')} className="mobile-create" aria-label={t.nav.share}>
        <Icon name="plus" size={24} />
      </Link>
      <Link href={p('/kaydedilenler')}>
        <Icon name="bookmark" size={22} />
        <span>{t.nav.savedShort}</span>
      </Link>
      <MobileNavAccount
        locale={locale}
        labels={{ profile: t.nav.profileShort, login: t.nav.loginShort }}
      />
    </nav>
  );
}
