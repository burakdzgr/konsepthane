'use server';

import { login, registerMember, requestPasswordReset } from '@/lib/auth';
import { formText } from '@/lib/form';
import { localeFromPath, localePath } from '@/lib/i18n';

/** Only same-site, non-protocol-relative paths may be used as a post-login destination. */
function safeNext(value: string, fallback: string) {
  return value.startsWith('/') && !value.startsWith('//') && !/^\/(api|admin)(\/|$)/.test(value)
    ? value
    : fallback;
}

/** `error` is 'invalid' | 'unverified' for login, or a translated message for sign-up. */
export type AuthFormState = { error?: string; ok?: boolean; next?: string } | null;

/**
 * Login used by the auth modal (`useActionState`): returns an error code for the dialog to render,
 * or `{ ok, next }` so the client can refresh the session/route (a server redirect to the current
 * path would not remount the session provider, leaving the dialog open).
 */
export async function loginFromModal(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawNext = formText(formData, 'next');
  const locale = localeFromPath(rawNext || '/tr');
  const next = safeNext(rawNext, localePath(locale, '/'));
  try {
    await login(formText(formData, 'email'), formText(formData, 'password'));
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED' ? 'unverified' : 'invalid',
    };
  }
  return { ok: true, next };
}

/** Sign-up from the modal: on success the dialog shows the "check your inbox" state. */
export async function registerFromModal(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await registerMember(
      formText(formData, 'email'),
      formText(formData, 'password'),
      formText(formData, 'displayName'),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' };
  }
  return { ok: true };
}

/** Reset-link request from the modal; unknown addresses get the same "sent" state. */
export async function forgotFromModal(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await requestPasswordReset(formText(formData, 'email'));
  } catch {
    /* same outcome for unknown addresses */
  }
  return { ok: true };
}
