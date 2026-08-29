import { memberPlatformApi } from './auth';

const publicMediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL ?? 'http://localhost:9000/ilham-media';

export async function uploadExperiencePhotos(formData: FormData) {
  const files = formData
    .getAll('photos')
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) throw new Error('Deneyim paylaşmak için en az bir fotoğraf yüklemelisin.');
  if (files.length > 10) throw new Error('Bir deneyime en fazla 10 fotoğraf eklenebilir.');
  const urls: string[] = [];
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type))
      throw new Error('Yalnızca JPG, PNG, WebP veya AVIF görsel yükleyebilirsin.');
    if (file.size > 15_000_000) throw new Error('Her fotoğraf en fazla 15 MB olabilir.');
    const upload = await memberPlatformApi<{ key: string; uploadUrl: string }>('/media/uploads', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type, byteSize: file.size }),
    });
    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!put.ok) throw new Error('Fotoğraf yüklenemedi. Lütfen yeniden dene.');
    urls.push(`${publicMediaUrl}/${upload.key}`);
  }
  return urls;
}
