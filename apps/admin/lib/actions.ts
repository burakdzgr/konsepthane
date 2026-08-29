import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AdminSessionError } from './api';

/**
 * Runs an admin mutation from a server action. API validation errors become a `?hata=` flash on
 * the page instead of an unhandled error screen; a lost session goes back to the login page.
 */
export async function runAdminAction(
  path: string,
  mutation: () => Promise<void>,
  success = 'Kaydedildi.',
) {
  let failure: string | null = null;
  let sessionLost = false;
  try {
    await mutation();
  } catch (error) {
    if (error instanceof AdminSessionError) sessionLost = true;
    else failure = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
  }
  if (sessionLost) redirect('/giris?hata=oturum');
  revalidatePath(path);
  redirect(
    failure
      ? `${path}?hata=${encodeURIComponent(failure)}`
      : `${path}?mesaj=${encodeURIComponent(success)}`,
  );
}

export type FlashParams = { mesaj?: string; hata?: string };
