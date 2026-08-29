'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Icon } from '@ilham/ui';
import { useSession } from '@/components/session/session-provider';
import { localeNames, localePath, locales, stripLocale, type Locale } from '@/lib/locales';

type AccountLabels = {
  login: string;
  accountMenu: string;
  profile: string;
  accountSettings: string;
  savedAndBoards: string;
  notifications: string;
  createPost: string;
  logout: string;
  saved: string;
  language: string;
};

/** Desktop account area: login button for visitors, avatar menu for members. */
export function HeaderAccount({
  locale,
  labels,
  logout,
}: {
  locale: Locale;
  labels: AccountLabels;
  logout: () => Promise<void>;
}) {
  const session = useSession();
  const p = (path: string) => localePath(locale, path);
  const member = session.member;
  if (!member) {
    return (
      <Link href={p('/giris')} className="btn btn-ghost header-login">
        {labels.login}
      </Link>
    );
  }
  const profileHref = member.profile?.username
    ? p(`/uye/${member.profile.username}`)
    : p('/kaydedilenler');
  return (
    <details className="member-menu hidden sm:block">
      <summary aria-label={labels.accountMenu}>
        <Avatar
          name={member.profile?.displayName ?? member.email}
          src={member.profile?.avatarUrl ?? undefined}
        />
        {member.unreadNotifications > 0 && (
          <span className="header-badge">{member.unreadNotifications}</span>
        )}
      </summary>
      <div className="member-menu-panel">
        <p className="px-3 pb-2 text-xs text-[var(--muted)]">
          {member.profile?.displayName ?? member.email}
        </p>
        <Link href={profileHref}>
          <Icon name="user" size={16} /> {labels.profile}
        </Link>
        <Link href={p('/kaydedilenler')}>
          <Icon name="bookmark" size={16} /> {labels.savedAndBoards}
        </Link>
        <Link href={p('/hesap')}>
          <Icon name="settings" size={16} /> {labels.accountSettings}
        </Link>
        <Link href={p('/bildirimler')}>
          <Icon name="bell" size={16} /> {labels.notifications}
        </Link>
        <Link href={p('/olustur')}>
          <Icon name="plus" size={16} /> {labels.createPost}
        </Link>
        <form action={logout}>
          <button type="submit">
            <Icon name="x" size={16} /> {labels.logout}
          </button>
        </form>
      </div>
    </details>
  );
}

/** Saved-items icon with the member's count badge. */
export function SavedLink({ locale, label }: { locale: Locale; label: string }) {
  const session = useSession();
  const count = session.member?.savedCount ?? 0;
  return (
    <Link
      href={localePath(locale, '/kaydedilenler')}
      aria-label={label}
      className="header-icon-link header-saved-link"
    >
      <Icon name="bookmark" />
      {count > 0 && <span className="header-badge">{count}</span>}
    </Link>
  );
}

/** Language switcher; computes the sibling-locale URLs from the current path on the client. */
export function LocaleMenu({ locale, label }: { locale: Locale; label: string }) {
  const pathname = stripLocale(usePathname() ?? '/');
  return (
    <details className="member-menu locale-menu">
      <summary aria-label={label} className="header-icon-link locale-summary">
        <span className="locale-code">{locale.toUpperCase()}</span>
        <Icon name="chevron-down" size={14} />
      </summary>
      <div className="member-menu-panel">
        {locales.map((code) => (
          <Link
            key={code}
            href={localePath(code, pathname)}
            hrefLang={code}
            lang={code}
            aria-current={code === locale ? 'true' : undefined}
            className={code === locale ? 'is-active' : undefined}
          >
            {localeNames[code]}
          </Link>
        ))}
      </div>
    </details>
  );
}

/** Last item of the mobile bottom bar: profile for members, login for visitors. */
export function MobileNavAccount({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { profile: string; login: string };
}) {
  const session = useSession();
  const member = session.member;
  const href = member
    ? member.profile?.username
      ? localePath(locale, `/uye/${member.profile.username}`)
      : localePath(locale, '/kaydedilenler')
    : localePath(locale, '/giris');
  return (
    <Link href={href}>
      <Icon name="user" size={22} />
      <span>{member ? labels.profile : labels.login}</span>
    </Link>
  );
}

/** Locale-aware sibling URLs for the mobile drawer's language row. */
export function useLocaleLinks(locale: Locale) {
  const pathname = stripLocale(usePathname() ?? '/');
  return locales.map((code) => ({
    code,
    label: localeNames[code],
    href: localePath(code, pathname),
    active: code === locale,
  }));
}
