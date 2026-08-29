'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Icon } from '@ilham/ui';
import { GoogleButton } from '@/components/google-button';
import { useSession } from '@/components/session/session-provider';
import {
  forgotFromModal,
  loginFromModal,
  registerFromModal,
  type AuthFormState,
} from '@/lib/auth-actions';

export type AuthModalLabels = {
  title: string;
  text: string;
  tabLogin: string;
  tabRegister: string;
  close: string;
  email: string;
  password: string;
  name: string;
  passwordHint: string;
  loginSubmit: string;
  registerSubmit: string;
  google: string;
  googleLoading: string;
  or: string;
  forgot: string;
  errorInvalid: string;
  errorUnverified: string;
  resend: string;
  registerSentTitle: string;
  registerSentText: string;
  terms: string;
  termsLink: string;
  privacyLink: string;
  forgotHeading: string;
  forgotText: string;
  forgotSubmit: string;
  forgotSentTitle: string;
  forgotSentText: string;
  back: string;
};

const OPEN_EVENT = 'kh:auth:open';
type View = 'login' | 'register' | 'forgot';
/** Member-only routes: a guest clicking a link to one of these gets the dialog, not a page change. */
const PROTECTED_PATH = /^\/(tr|en)\/(kaydedilenler|hesap|bildirimler|olustur)(\/|$)/;
/** Full-page auth flows: the dialog never opens on top of them (links behave normally there). */
const AUTH_PAGE = /^\/(tr|en)\/(giris|kayit|sifremi-unuttum|sifre-sifirla|dogrula)(\/|$)/;

/** Any component (or a plain link to /giris) can open the dialog: `openAuthModal('/tr/hesap')`. */
export function openAuthModal(next?: string, tab: View = 'login') {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { next, tab } }));
}

/**
 * Site-wide login / sign-up dialog. Opens on demand (event), when a guest clicks a link to a
 * member-only page (fast action, no navigation), or when a protected page mounts `<AuthRequired>`.
 * The full /giris, /kayit and /sifremi-unuttum pages stay as they are. Uses the same
 * server actions/session cookies as the full-page flows; Google sign-in goes through
 * /api/auth/google with `next` preserved.
 */
export function AuthModalHost({ labels, locale }: { labels: AuthModalLabels; locale: string }) {
  const session = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<View>('login');
  const [next, setNext] = useState<string>('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef(false);
  guestRef.current = session.status === 'ready' && !session.member;
  const loginPath = `/${locale}/giris`;
  const onAuthPageRef = useRef(false);
  onAuthPageRef.current = AUTH_PAGE.test(pathname ?? '');

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ next?: string; tab?: View }>).detail ?? {};
      if (onAuthPageRef.current) {
        // Already on the login page: there is nothing to overlay, so just keep the destination.
        const target = detail.next ? `?next=${encodeURIComponent(detail.next)}` : '';
        window.location.assign(`${loginPath}${target}`);
        return;
      }
      setNext(detail.next ?? window.location.pathname + window.location.search);
      setTab(detail.tab ?? 'login');
      setOpen(true);
    };
    // Guests clicking a link to a member-only page get the dialog instead of a page change.
    const onClick = (event: MouseEvent) => {
      if (!guestRef.current || onAuthPageRef.current) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const anchor = (event.target as Element | null)?.closest('a[href]');
      if (!anchor || anchor.closest('.auth-modal')) return;
      const url = new URL((anchor as HTMLAnchorElement).href, window.location.href);
      if (url.origin !== window.location.origin || !PROTECTED_PATH.test(url.pathname)) return;
      event.preventDefault();
      setNext(url.pathname + url.search);
      setTab('login');
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      document.removeEventListener('click', onClick, true);
    };
  }, [loginPath]);

  useEffect(() => {
    if (session.member && open) setOpen(false);
  }, [session.member, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || onAuthPageRef.current) return null;
  const googleHref = `/api/auth/google?next=${encodeURIComponent(next || `/${locale}`)}`;
  return (
    <div className="auth-modal-root" role="presentation" onClick={() => setOpen(false)}>
      <div
        ref={dialogRef}
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="auth-modal-close"
          aria-label={labels.close}
          onClick={() => setOpen(false)}
        >
          <Icon name="x" size={18} />
        </button>
        <img
          src="/brand/konsepthane-logo.png?v=2"
          alt="Konsepthane"
          width="1901"
          height="509"
          className="auth-modal-logo"
        />
        <h2 id="auth-modal-title" className="auth-modal-title">
          {tab === 'forgot' ? labels.forgotHeading : labels.title}
        </h2>
        <p className="auth-modal-text">{tab === 'forgot' ? labels.forgotText : labels.text}</p>
        {tab === 'forgot' ? (
          <ForgotForm labels={labels} onBack={() => setTab('login')} />
        ) : (
          <>
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'login'}
                className={tab === 'login' ? 'is-active' : ''}
                onClick={() => setTab('login')}
              >
                {labels.tabLogin}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'register'}
                className={tab === 'register' ? 'is-active' : ''}
                onClick={() => setTab('register')}
              >
                {labels.tabRegister}
              </button>
            </div>
            <GoogleButton
              href={googleHref}
              label={labels.google}
              loadingLabel={labels.googleLoading}
            />
            <p className="auth-divider">
              <span>{labels.or}</span>
            </p>
            {tab === 'login' ? (
              <LoginForm
                labels={labels}
                next={next}
                locale={locale}
                onForgot={() => setTab('forgot')}
              />
            ) : (
              <RegisterForm labels={labels} locale={locale} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoginForm({
  labels,
  next,
  locale,
  onForgot,
}: {
  labels: AuthModalLabels;
  next: string;
  locale: string;
  onForgot: () => void;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginFromModal, null);
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!state?.ok) return;
    const target = state.next ?? `/${locale}`;
    void session.refresh().then(() => {
      if (target !== window.location.pathname + window.location.search) router.push(target);
      else router.refresh();
    });
  }, [state]);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next || `/${locale}`} />
      {state?.error && (
        <p role="alert" className="auth-error">
          {state.error === 'unverified' ? labels.errorUnverified : labels.errorInvalid}{' '}
          {state.error === 'unverified' && (
            <Link href={`/${locale}/dogrula`} className="underline">
              {labels.resend}
            </Link>
          )}
        </p>
      )}
      <label>
        {labels.email}
        <input
          className="field"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="username"
          required
        />
      </label>
      <label>
        {labels.password}
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
        {labels.loginSubmit}
      </button>
      <button type="button" className="auth-link" onClick={onForgot}>
        {labels.forgot}
      </button>
    </form>
  );
}

function ForgotForm({ labels, onBack }: { labels: AuthModalLabels; onBack: () => void }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(forgotFromModal, null);
  if (state?.ok)
    return (
      <div className="auth-sent">
        <strong>{labels.forgotSentTitle}</strong>
        <p>{labels.forgotSentText}</p>
        <button type="button" className="auth-link" onClick={onBack}>
          {labels.back}
        </button>
      </div>
    );
  return (
    <form action={action} className="auth-form">
      <label>
        {labels.email}
        <input className="field" name="email" type="email" autoComplete="email" required />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
        {labels.forgotSubmit}
      </button>
      <button type="button" className="auth-link" onClick={onBack}>
        {labels.back}
      </button>
    </form>
  );
}

function RegisterForm({ labels, locale }: { labels: AuthModalLabels; locale: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerFromModal, null);
  if (state?.ok)
    return (
      <div className="auth-sent">
        <strong>{labels.registerSentTitle}</strong>
        <p>{labels.registerSentText}</p>
      </div>
    );
  return (
    <form action={action} className="auth-form">
      {state?.error && (
        <p role="alert" className="auth-error">
          {state.error}
        </p>
      )}
      <label>
        {labels.name}
        <input
          className="field"
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
        />
      </label>
      <label>
        {labels.email}
        <input className="field" name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        {labels.password}
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
        <small>{labels.passwordHint}</small>
      </label>
      <p className="auth-terms">
        {labels.terms}{' '}
        <Link href={`/${locale}/kullanim-kosullari`} className="underline" target="_blank">
          {labels.termsLink}
        </Link>{' '}
        ·{' '}
        <Link href={`/${locale}/kvkk-aydinlatma`} className="underline" target="_blank">
          {labels.privacyLink}
        </Link>
      </p>
      <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
        {labels.registerSubmit}
      </button>
    </form>
  );
}

/**
 * Guest landing on a protected page: opens the dialog immediately and shows a quiet placeholder
 * behind it (the page content itself is never rendered for guests).
 */
export function AuthRequired({ next, title, text }: { next: string; title: string; text: string }) {
  const session = useSession();
  useEffect(() => {
    if (session.status === 'ready' && !session.member) openAuthModal(next);
  }, [session.status, session.member, next]);
  return (
    <div className="wrap py-16">
      <div className="auth-required">
        <Icon name="user" size={20} />
        <strong>{title}</strong>
        <p>{text}</p>
        <button type="button" className="btn btn-primary" onClick={() => openAuthModal(next)}>
          {title}
        </button>
      </div>
    </div>
  );
}
