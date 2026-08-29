'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MemberSessionError, clearSession, hasMemberSession, loginHref, memberApi } from './auth';
import { formText } from './form';
import { getLocale, localeFromPath, localePath } from './i18n';

function safePath(value: string | null | undefined, fallback = '/') {
  const path = value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
  return localePath(localeFromPath(path), path);
}

function withMessage(path: string, key: 'mesaj' | 'hata', message: string) {
  const [base, hash] = path.split('#');
  const url = new URL(base ?? '/', 'http://local');
  url.searchParams.set(key, message);
  return `${url.pathname}${url.search}${hash ? `#${hash}` : ''}`;
}

/**
 * Runs a member mutation. Visitors are sent to login with a return path; API validation errors are
 * surfaced as a `?hata=` flash on the return path instead of crashing the page.
 */
async function runMemberAction(returnTo: string, mutation: () => Promise<void>, success?: string) {
  if (!(await hasMemberSession())) redirect(loginHref(returnTo));
  let failure: string | null = null;
  let sessionLost = false;
  try {
    await mutation();
  } catch (error) {
    if (error instanceof MemberSessionError) sessionLost = true;
    else failure = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
  }
  if (sessionLost) redirect(loginHref(returnTo));
  revalidatePath(returnTo.split('#')[0]?.split('?')[0] ?? '/');
  if (failure) redirect(withMessage(returnTo, 'hata', failure));
  redirect(success ? withMessage(returnTo, 'mesaj', success) : returnTo);
}

export async function toggleSaveAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'));
  const contentType = formText(formData, 'contentType');
  const contentId = formText(formData, 'contentId');
  await runMemberAction(returnTo, async () => {
    await memberApi('/saves/toggle', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentId }),
    });
    revalidatePath(localePath(localeFromPath(returnTo), '/kaydedilenler'));
  });
}

export async function toggleReactionAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'));
  const contentType = formText(formData, 'contentType');
  const contentId = formText(formData, 'contentId');
  await runMemberAction(returnTo, async () => {
    await memberApi('/reactions/toggle', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentId, reactionType: 'LIKE' }),
    });
  });
}

export async function toggleQuestionFollowAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'));
  const questionId = formText(formData, 'questionId');
  await runMemberAction(returnTo, async () => {
    await memberApi(`/questions/${questionId}/follow/toggle`, { method: 'POST' });
    revalidatePath(localePath(localeFromPath(returnTo), '/sorular'));
  });
}

export async function acceptAnswerAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'));
  const questionId = formText(formData, 'questionId');
  const answerId = formText(formData, 'answerId');
  await runMemberAction(
    returnTo,
    async () => {
      await memberApi(`/questions/${questionId}/answers/${answerId}/accept`, { method: 'PATCH' });
    },
    'Yanıt kabul edildi.',
  );
}

export async function addToCollectionAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'));
  const contentType = formText(formData, 'contentType');
  const contentId = formText(formData, 'contentId');
  const collectionId = formText(formData, 'collectionId');
  const newTitle = formText(formData, 'newTitle');
  await runMemberAction(
    returnTo,
    async () => {
      let targetId = collectionId;
      if (!targetId) {
        if (newTitle.trim().length < 2) throw new Error('Yeni pano için bir ad yaz.');
        const created = await memberApi<{ id: string }>('/collections', {
          method: 'POST',
          body: JSON.stringify({ title: newTitle.trim(), isPublic: false }),
        });
        targetId = created.id;
      }
      await memberApi(`/collections/${targetId}/items`, {
        method: 'POST',
        body: JSON.stringify({ contentType, contentId }),
      });
      revalidatePath(localePath(localeFromPath(returnTo), '/kaydedilenler'));
    },
    'Panoya eklendi.',
  );
}

export async function createCollectionAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'), '/kaydedilenler');
  const title = formText(formData, 'title');
  const description = formText(formData, 'description');
  const isPublic = formData.get('isPublic') === 'on';
  await runMemberAction(
    returnTo,
    async () => {
      await memberApi('/collections', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: description || undefined,
          isPublic,
        }),
      });
    },
    'Pano oluşturuldu.',
  );
}

/** Removes content from one board from a content page (picker); addressed by content, not item id. */
export async function removeFromCollectionAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'));
  const contentType = formText(formData, 'contentType');
  const contentId = formText(formData, 'contentId');
  const collectionId = formText(formData, 'collectionId');
  await runMemberAction(
    returnTo,
    async () => {
      await memberApi(`/collections/${collectionId}/items`, {
        method: 'DELETE',
        body: JSON.stringify({ contentType, contentId }),
      });
      revalidatePath(localePath(localeFromPath(returnTo), '/kaydedilenler'));
    },
    'Panodan kaldırıldı.',
  );
}

export async function updateCollectionAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'), '/kaydedilenler');
  const collectionId = formText(formData, 'collectionId');
  const visibility = formText(formData, 'visibility');
  await runMemberAction(returnTo, async () => {
    await memberApi(`/collections/${collectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    });
  });
}

export async function removeCollectionItemAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'), '/kaydedilenler');
  const collectionId = formText(formData, 'collectionId');
  const itemId = formText(formData, 'itemId');
  await runMemberAction(
    returnTo,
    async () => {
      await memberApi(`/collections/${collectionId}/items/${itemId}`, { method: 'DELETE' });
      revalidatePath(localePath(localeFromPath(returnTo), '/kaydedilenler'));
    },
    'Panodan çıkarıldı.',
  );
}

export async function reportContentAction(formData: FormData) {
  const returnTo = safePath(formText(formData, 'returnTo'));
  const contentType = formText(formData, 'contentType');
  const contentId = formText(formData, 'contentId');
  const reason = formText(formData, 'reason');
  const details = formText(formData, 'details');
  await runMemberAction(
    returnTo,
    async () => {
      await memberApi('/reports', {
        method: 'POST',
        body: JSON.stringify({ contentType, contentId, reason, details: details || undefined }),
      });
    },
    'Bildirimin moderasyon ekibine iletildi.',
  );
}

export async function logoutAction() {
  await clearSession();
  redirect(localePath(await getLocale(), '/'));
}
