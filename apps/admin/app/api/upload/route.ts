import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_ACCESS_COOKIE } from '@/lib/api';

const apiUrl = process.env.INTERNAL_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';

/**
 * Browser → admin (same origin, cookie session) → API multipart upload. Keeps the access token
 * server-side and lets the drag-and-drop field post a plain FormData.
 */
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(ADMIN_ACCESS_COOKIE)?.value;
  if (!token)
    return NextResponse.json({ message: 'Oturum süresi doldu; sayfayı yenileyin.' }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ message: 'Dosya seçilmedi.' }, { status: 400 });
  const upstream = new FormData();
  upstream.append('file', file, file.name);
  const response = await fetch(`${apiUrl}/v1/media/upload`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: upstream,
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : (payload.message ?? 'Yükleme başarısız.');
    return NextResponse.json({ message }, { status: response.status });
  }
  return NextResponse.json(payload);
}
