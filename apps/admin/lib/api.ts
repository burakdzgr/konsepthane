import { cookies } from 'next/headers';
import { cache } from 'react';
import { translateValidationMessage } from '@ilham/validation';

const apiUrl = process.env.INTERNAL_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export const ADMIN_ACCESS_COOKIE =
  process.env.NODE_ENV === 'production'
    ? '__Host-konsepthane_admin_access'
    : 'konsepthane_admin_access';
export const ADMIN_REFRESH_COOKIE =
  process.env.NODE_ENV === 'production'
    ? '__Host-konsepthane_admin_refresh'
    : 'konsepthane_admin_refresh';

/** A write/manage permission unlocks the back office; read-only or member accounts are turned away. */
export const PANEL_PERMISSIONS = [
  'category.write',
  'concept.write',
  'moderation.manage',
  'user.write',
  'role.manage',
  'seo.manage',
  'curation.manage',
];

export class AdminSessionError extends Error {
  constructor(message = 'Oturum gerekli.') {
    super(message);
    this.name = 'AdminSessionError';
  }
}

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; permissions: string[] };
};

export async function login(email: string, password: string) {
  const response = await fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('E-posta veya parola hatalı.');
  const result = (await response.json()) as LoginResult;
  if (!result.user.permissions.some((permission) => PANEL_PERMISSIONS.includes(permission)))
    throw new Error(
      'Bu hesap yönetim paneline erişemez. Editör, moderatör veya yönetici hesabıyla giriş yapın.',
    );
  const store = await cookies();
  store.set(ADMIN_ACCESS_COOKIE, result.accessToken, { ...cookieOptions, maxAge: 15 * 60 });
  store.set(ADMIN_REFRESH_COOKIE, result.refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function logout() {
  const store = await cookies();
  const refreshToken = store.get(ADMIN_REFRESH_COOKIE)?.value;
  try {
    if (refreshToken)
      await fetch(`${apiUrl}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
  } finally {
    store.delete(ADMIN_ACCESS_COOKIE);
    store.delete(ADMIN_REFRESH_COOKIE);
  }
}

export type AdminActor = { sub: string; email: string; permissions: string[] };

export const getAdminActor = cache(async () => adminApi<AdminActor>('/auth/me'));

export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(ADMIN_ACCESS_COOKIE)?.value;
  if (!token) throw new AdminSessionError();
  const response = await fetch(`${apiUrl}/v1${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (response.status === 401) throw new AdminSessionError('Oturum süresi doldu.');
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ message: 'İşlem tamamlanamadı.' }))) as {
      message?: string | string[];
    };
    const messages = Array.isArray(payload.message) ? payload.message : [payload.message];
    const message = messages
      .filter((entry): entry is string => Boolean(entry))
      .map(translateValidationMessage)
      .join(' ');
    throw new Error(message || `İşlem tamamlanamadı (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
