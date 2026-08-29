'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@ilham/ui';
import { useLocaleLinks } from '@/components/header-account';
import { useSession } from '@/components/session/session-provider';
import { localePath, type Locale } from '@/lib/locales';

type NavLink = { label: string; href: string; community: boolean };
type TopicLink = { label: string; href: string; dot: string };

export function MobileMenu({
  locale,
  labels,
  primary,
  topics,
  logout,
}: {
  locale: Locale;
  labels: {
    menu: string;
    close: string;
    browse: string;
    community: string;
    account: string;
    language: string;
    login: string;
    share: string;
    logout: string;
    profile: string;
    savedAndBoards: string;
    notifications: string;
    topics: string;
  };
  primary: NavLink[];
  topics: TopicLink[];
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const session = useSession();
  const localeLinks = useLocaleLinks(locale);
  const p = (path: string) => localePath(locale, path);
  const homeHref = p('/');
  const member = session.member;

  // Any navigation closes the drawer (the header lives in the layout and survives client transitions).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  const isActive = (href: string) => {
    const clean = href.split('?')[0] ?? href;
    return pathname === clean || (clean !== homeHref && pathname.startsWith(`${clean}/`));
  };

  const browse = primary.filter((item) => !item.community);
  const community = primary.filter((item) => item.community);
  const accountLinks = member
    ? [
        {
          label: labels.profile,
          href: member.profile?.username
            ? p(`/uye/${member.profile.username}`)
            : p('/kaydedilenler'),
          icon: 'user' as const,
        },
        { label: labels.savedAndBoards, href: p('/kaydedilenler'), icon: 'bookmark' as const },
        { label: labels.notifications, href: p('/bildirimler'), icon: 'bell' as const },
      ]
    : [];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="header-icon-link mobile-menu-button"
        aria-label={labels.menu}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={22} />
      </button>
      {/* Portalled to <body>: the sticky header's backdrop-filter would otherwise
          become the containing block and clip the fixed overlay to the header. */}
      {open &&
        createPortal(
          <div className="mobile-drawer-root">
            <div className="mobile-drawer-backdrop" onClick={() => setOpen(false)} />
            <aside
              id={panelId}
              className="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={labels.menu}
            >
              <div className="mobile-drawer-head">
                <Link href={homeHref} className="brand">
                  <img
                    src="/brand/konsepthane-logo.png?v=2"
                    alt="Konsepthane"
                    width="1901"
                    height="509"
                    decoding="async"
                  />
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  className="header-icon-link"
                  aria-label={labels.close}
                  onClick={() => setOpen(false)}
                >
                  <Icon name="x" size={22} />
                </button>
              </div>

              <nav className="mobile-drawer-section" aria-label={labels.browse}>
                <h3>{labels.browse}</h3>
                {browse.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive(item.href) ? 'is-active' : undefined}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    {item.label}
                    <Icon name="chevron-right" size={16} className="mobile-drawer-chevron" />
                  </Link>
                ))}
              </nav>

              <nav
                className="mobile-drawer-section mobile-drawer-topics"
                aria-label={labels.topics}
              >
                <h3>{labels.topics}</h3>
                <div className="mobile-drawer-topic-grid">
                  {topics.map((topic) => (
                    <Link
                      key={topic.href + topic.label}
                      href={topic.href}
                      style={{ ['--dot' as string]: topic.dot }}
                    >
                      <i aria-hidden="true" />
                      {topic.label}
                    </Link>
                  ))}
                </div>
              </nav>

              <nav className="mobile-drawer-section" aria-label={labels.community}>
                <h3>{labels.community}</h3>
                {community.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive(item.href) ? 'is-active' : undefined}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    {item.label}
                    <Icon name="chevron-right" size={16} className="mobile-drawer-chevron" />
                  </Link>
                ))}
                <Link href={p('/olustur')} className="mobile-drawer-cta">
                  <Icon name="plus" size={16} /> {labels.share}
                </Link>
              </nav>

              <nav className="mobile-drawer-section" aria-label={labels.account}>
                <h3>{labels.account}</h3>
                {member ? (
                  <>
                    <p className="mobile-drawer-user">
                      {member.profile?.displayName ?? member.email}
                    </p>
                    {accountLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={isActive(item.href) ? 'is-active' : undefined}
                      >
                        <Icon name={item.icon} size={16} /> {item.label}
                      </Link>
                    ))}
                    <form action={logout}>
                      <button type="submit">
                        <Icon name="x" size={16} /> {labels.logout}
                      </button>
                    </form>
                  </>
                ) : (
                  <Link href={p('/giris')}>
                    <Icon name="user" size={16} /> {labels.login}
                  </Link>
                )}
              </nav>

              <div className="mobile-drawer-section mobile-drawer-locales">
                <h3>{labels.language}</h3>
                <div className="mobile-drawer-locale-row">
                  {localeLinks.map((item) => (
                    <Link
                      key={item.code}
                      href={item.href}
                      hrefLang={item.code}
                      lang={item.code}
                      aria-current={item.active ? 'true' : undefined}
                      className={item.active ? 'is-active' : undefined}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
