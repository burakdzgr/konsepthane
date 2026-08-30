import { cache } from 'react';
import { cookies } from 'next/headers';
import type { InteractionState, MemberSummary, SavedItem } from '@ilham/shared-types';
import { translateValidationMessage } from '@ilham/validation';
import { localeFromPath, localePath } from './i18n';

const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export const ACCESS_COOKIE = 'ilham_member_access';
export const REFRESH_COOKIE = 'ilham_member_refresh';

export class MemberSessionError extends Error {
  constructor(message = 'Oturum gerekli.') {
    super(message);
    this.name = 'MemberSessionError';
  }
}

export async function login(email: string, password: string) {
  const response = await fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { code?: string };
    throw new Error(payload.code === 'EMAIL_NOT_VERIFIED' ? 'EMAIL_NOT_VERIFIED' : 'INVALID');
  }
  const result = (await response.json()) as { accessToken: string; refreshToken: string };
  await storeSession(result);
}

/** Public auth flows (no session): sign-up, verification, password reset. Throws the API message. */
async function publicAuthPost(path: string, body: Record<string, string>) {
  const response = await fetch(`${apiUrl}/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
    throw new Error(translateValidationMessage(message ?? 'İşlem tamamlanamadı.'));
  }
}
/**
 * Google ID token → API verification → the same member session cookies as a password login.
 * Throws the API error `code` (ACCOUNT_DISABLED, EMAIL_NOT_VERIFIED) or GOOGLE_FAILED.
 */
export async function loginWithGoogleIdToken(idToken: string) {
  const response = await fetch(`${apiUrl}/v1/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { code?: string };
    throw new Error(payload.code ?? 'GOOGLE_FAILED');
  }
  const result = (await response.json()) as { accessToken: string; refreshToken: string };
  await storeSession(result);
}

export type LinkedProviders = {
  email: string;
  hasPassword: boolean;
  providers: Array<{ provider: string; email: string | null; linkedAt: string }>;
};
export async function getLinkedProviders() {
  try {
    return await memberApi<LinkedProviders>('/auth/providers');
  } catch {
    return null;
  }
}
export const unlinkProvider = (provider: string) =>
  memberApi(`/auth/providers/${encodeURIComponent(provider)}`, { method: 'DELETE' });
export const requestPasswordSetup = () =>
  memberApi('/auth/password-setup-link', { method: 'POST' });
/** Self-service account deletion (same endpoint the mobile app uses). */
export const deleteAccount = () => memberApi('/auth/me', { method: 'DELETE' });

export const registerMember = (email: string, password: string, displayName: string) =>
  publicAuthPost('register', { email, password, displayName });
export const verifyEmailToken = (token: string) => publicAuthPost('verify-email', { token });
export const resendVerification = (email: string) =>
  publicAuthPost('resend-verification', { email });
export const requestPasswordReset = (email: string) => publicAuthPost('forgot-password', { email });
export const resetPasswordWithToken = (token: string, password: string) =>
  publicAuthPost('reset-password', { token, password });

export async function storeSession(result: { accessToken: string; refreshToken: string }) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, result.accessToken, { ...cookieOptions, maxAge: 15 * 60 });
  store.set(REFRESH_COOKIE, result.refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * Access token from the cookie jar. Expired access cookies are rotated by `proxy.ts` before the
 * request reaches Server Components, so no refresh call happens here (cookies cannot be written
 * during rendering and a half-applied rotation would revoke the member's session).
 */
async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function hasMemberSession() {
  const store = await cookies();
  return store.has(ACCESS_COOKIE) || store.has(REFRESH_COOKIE);
}

export async function memberPlatformApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new MemberSessionError();
  const response = await fetch(`${apiUrl}/v1${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (response.status === 401) throw new MemberSessionError('Oturum süresi doldu.');
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ message: 'İşlem tamamlanamadı.' }))) as {
      message?: string | string[];
    };
    const messages = Array.isArray(payload.message) ? payload.message : [payload.message];
    const message = messages
      .filter((entry): entry is string => Boolean(entry))
      .map(translateValidationMessage)
      .join(' ');
    throw new Error(message || 'İşlem tamamlanamadı.');
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function memberApi<T>(path: string, init: RequestInit = {}) {
  return memberPlatformApi<T>(`/community${path}`, init);
}

export type FollowedTopic = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  contentCount: number;
  followerCount: number;
};

/** Topics the signed-in member follows (empty for visitors or when the API is unavailable). */
export const getFollowedTopics = cache(async (): Promise<FollowedTopic[]> => {
  if (!(await hasMemberSession())) return [];
  try {
    return await memberApi<FollowedTopic[]>('/topics/following/mine');
  } catch {
    return [];
  }
});

/** Current member summary or null for visitors. Cached per request. */
export const getMember = cache(async (): Promise<MemberSummary | null> => {
  if (!(await hasMemberSession())) return null;
  try {
    return await memberApi<MemberSummary>('/me');
  } catch {
    return null;
  }
});

/** Keys (`TYPE:id`) of everything the member saved, so cards can render their real state. */
export const getSavedKeys = cache(async (): Promise<Set<string>> => {
  const member = await getMember();
  if (!member) return new Set();
  try {
    const items = await memberApi<SavedItem[]>('/saves/mine');
    return new Set(items.map((item) => `${item.contentType}:${item.contentId}`));
  } catch {
    return new Set();
  }
});

export async function getInteractionState(contentType: string, contentId: string) {
  const member = await getMember();
  if (!member) return null;
  try {
    return await memberApi<InteractionState>(
      `/interactions/state?contentType=${encodeURIComponent(contentType)}&contentId=${encodeURIComponent(contentId)}`,
    );
  } catch {
    return null;
  }
}

/** Login URL in the locale of the return path (`/en/...` → `/en/giris?next=...`). */
export function loginHref(next?: string | null) {
  const locale = localeFromPath(next);
  const base = localePath(locale, '/giris');
  return next && next.startsWith('/') ? `${base}?next=${encodeURIComponent(next)}` : base;
}
