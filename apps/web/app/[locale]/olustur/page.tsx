import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card, ComposerModal, Input, Select, TextArea, TextInput } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { Flash } from '@/components/engagement';
import { getCategories, getConcepts } from '@/lib/api';
import { MemberSessionError, getMember, hasMemberSession, loginHref, memberApi } from '@/lib/auth';
import { getEventTypes } from '@/lib/community';
import { formText } from '@/lib/form';
import { uploadExperiencePhotos } from '@/lib/media';
import { asLocale, getLocale, localePath } from '@/lib/i18n';

async function createAction(formData: FormData) {
  'use server';
  const type = formText(formData, 'type');
  const title = formText(formData, 'title');
  const body = formText(formData, 'body');
  const conceptId = formText(formData, 'conceptId') || undefined;
  const eventTypeId = formText(formData, 'eventTypeId') || undefined;
  const locale = await getLocale();
  const returnTo = localePath(
    locale,
    `/olustur?tur=${encodeURIComponent(type)}${conceptId ? `&concept=${conceptId}` : ''}`,
  );
  if (!(await hasMemberSession())) redirect(loginHref(returnTo));
  let destination = '/olustur';
  let failure: string | null = null;
  let sessionLost = false;
  try {
    destination = await submit(type, { title, body, conceptId, eventTypeId }, formData);
  } catch (error) {
    if (error instanceof MemberSessionError) sessionLost = true;
    else failure = error instanceof Error ? error.message : 'Paylaşım gönderilemedi.';
  }
  if (sessionLost) redirect(loginHref(returnTo));
  if (failure) redirect(`${returnTo}&hata=${encodeURIComponent(failure)}`);
  redirect(localePath(locale, destination));
}

async function submit(
  type: string,
  base: {
    title: string;
    body: string;
    conceptId?: string | undefined;
    eventTypeId?: string | undefined;
  },
  formData: FormData,
): Promise<string> {
  const { title, body, conceptId, eventTypeId } = base;
  if (type === 'ilham') {
    const files = formData
      .getAll('photos')
      .filter((value): value is File => value instanceof File && value.size > 0);
    const imageUrls = files.length ? await uploadExperiencePhotos(formData) : [];
    await memberApi('/concept-suggestions', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: formText(formData, 'categoryId'),
        title,
        summary: formText(formData, 'summary'),
        body,
        imageUrls,
        rightsConfirmed: formData.get('rightsConfirmed') === 'on',
      }),
    });
    return '/fikirler?mesaj=' + encodeURIComponent('Fikrin editör incelemesine gönderildi.');
  }
  if (type === 'soru') {
    const files = formData
      .getAll('photos')
      .filter((value): value is File => value instanceof File && value.size > 0);
    const imageUrls = files.length ? await uploadExperiencePhotos(formData) : [];
    const item = await memberApi<{ slug: string }>('/questions', {
      method: 'POST',
      body: JSON.stringify({ title, body, conceptId, eventTypeId, imageUrls }),
    });
    return `/soru/${item.slug}`;
  }
  if (type === 'deneyim') {
    const imageUrls = await uploadExperiencePhotos(formData);
    await memberApi('/experiences', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        conceptId,
        eventTypeId,
        imageUrls,
        city: formText(formData, 'city') || undefined,
        venueType: formText(formData, 'venueType') || undefined,
        ageLabel: formText(formData, 'ageLabel') || undefined,
        guestCount: Number(formText(formData, 'guestCount')) || undefined,
        budgetLabel: formText(formData, 'budgetLabel') || undefined,
        themeVariation: formText(formData, 'themeVariation') || undefined,
        colors: formText(formData, 'colors')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        tips: formText(formData, 'tips') || undefined,
        whatWorked: formText(formData, 'whatWorked') || undefined,
        whatWouldChange: formText(formData, 'whatWouldChange') || undefined,
        rightsConfirmed: formData.get('rightsConfirmed') === 'on',
      }),
    });
    return '/deneyimler?gonderildi=1';
  }
  if (type === 'tartisma') {
    const item = await memberApi<{ slug: string }>('/discussions', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });
    return `/tartisma/${item.slug}`;
  }
  if (type === 'anket') {
    const options = formText(formData, 'options')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
    const item = await memberApi<{ slug: string }>('/polls', {
      method: 'POST',
      body: JSON.stringify({ title, body, options }),
    });
    return `/anket/${item.slug}`;
  }
  return '/olustur';
}

export const metadata: Metadata = { title: 'İçerik oluştur', robots: 'noindex,nofollow' };
export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tur?: string; concept?: string; hata?: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const [{ tur, concept }, concepts, eventTypes, categories, member] = await Promise.all([
    searchParams,
    getConcepts({ pageSize: 50 }),
    getEventTypes(),
    getCategories(),
    getMember(),
  ]);
  const supported = ['ilham', 'soru', 'tartisma', 'anket', 'deneyim'].includes(tur ?? '');
  const currentPath = p(
    `/olustur${tur ? `?tur=${tur}${concept ? `&concept=${concept}` : ''}` : ''}`,
  );
  return (
    <>
      <PageHeader
        eyebrow="Konsepthane'ye katkı"
        title={
          tur === 'deneyim'
            ? 'Deneyimini paylaş'
            : tur === 'ilham'
              ? 'Fikrini editörlere gönder'
              : 'Ne paylaşmak istiyorsun?'
        }
        description={
          tur === 'deneyim'
            ? 'Gerçek kutlamanı fotoğraflarla anlat. Paylaşımın moderasyondan sonra ilgili konseptte, deneyimler alanında ve profilinde görünür.'
            : tur === 'ilham'
              ? 'Uygulanabilir fikrini bir editoryal içerik önerisi olarak gönder. Editör incelemesinden önce yayımlanmaz.'
              : 'Yardıma ihtiyacın varsa soru sor; uyguladığın bir kutlama varsa ayrı bir deneyim olarak paylaş.'
        }
      />
      <div className="wrap reading py-8">
        <Flash />
        {!member && (
          <div className="mb-6 rounded-2xl border border-[var(--line)] bg-white p-5 text-sm leading-6">
            Paylaşım yapmak için üye girişi gerekir.{' '}
            <Link
              href={loginHref(currentPath)}
              className="font-semibold text-[var(--accent-strong)]"
            >
              Giriş yap →
            </Link>
          </div>
        )}
        {!supported ? (
          <ComposerModal />
        ) : (
          <Card className="p-6 sm:p-8">
            <a href={p('/olustur')} className="text-sm font-semibold text-[var(--accent-strong)]">
              ← Türü değiştir
            </a>
            <h2 className="mt-4 font-serif text-3xl">
              {tur === 'soru'
                ? 'Soru sor'
                : tur === 'deneyim'
                  ? 'Fotoğraflı deneyim oluştur'
                  : tur === 'ilham'
                    ? 'Fikir / içerik öner'
                    : tur === 'tartisma'
                      ? 'Tartışma başlat'
                      : 'Anket oluştur'}
            </h2>
            <form action={createAction} encType="multipart/form-data" className="mt-7 grid gap-7">
              <input type="hidden" name="type" value={tur} />
              {tur === 'deneyim' && (
                <CreationStep number="1" title="Hangi etkinlik?">
                  <Select name="eventTypeId" required defaultValue="">
                    <option value="" disabled>
                      Etkinlik türünü seç
                    </option>
                    {eventTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </CreationStep>
              )}
              {tur === 'ilham' && (
                <CreationStep number="1" title="Hangi kategoriye ait?">
                  <Select name="categoryId" required defaultValue="">
                    <option value="" disabled>
                      Kategori seç
                    </option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </CreationStep>
              )}
              {(tur === 'deneyim' || tur === 'soru') && (
                <CreationStep
                  number={tur === 'deneyim' ? '2' : '1'}
                  title="Bir konseptle ilgili mi?"
                >
                  <Select name="conceptId" defaultValue={concept ?? ''}>
                    <option value="">Hayır / emin değilim</option>
                    {concepts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </Select>
                </CreationStep>
              )}
              {(tur === 'deneyim' || tur === 'soru' || tur === 'ilham') && (
                <CreationStep
                  number={tur === 'deneyim' ? '3' : '2'}
                  title={tur === 'deneyim' ? 'Fotoğrafları yükle' : 'Referans görselleri ekle'}
                >
                  <label className="photo-dropzone">
                    <strong>
                      {tur === 'deneyim' ? 'En az bir fotoğraf zorunlu' : 'İsteğe bağlı'}
                    </strong>
                    <span>JPG, PNG, WebP veya AVIF · dosya başına en fazla 15 MB</span>
                    <input
                      name="photos"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      required={tur === 'deneyim'}
                    />
                  </label>
                </CreationStep>
              )}
              <CreationStep
                number={tur === 'deneyim' ? '4' : tur === 'soru' || tur === 'ilham' ? '3' : '1'}
                title={
                  tur === 'deneyim'
                    ? 'Deneyimini anlat'
                    : tur === 'ilham'
                      ? 'Fikrini yapılandır'
                      : 'İçeriğini yaz'
                }
              >
                <TextInput label="Başlık" name="title" minLength={10} maxLength={180} required />
                {tur === 'ilham' && (
                  <div className="mt-4">
                    <TextArea
                      label="Kısa özet"
                      name="summary"
                      minLength={40}
                      maxLength={320}
                      rows={3}
                      required
                      hint="Kart ve arama sonuçlarında görünen tek paragraf."
                    />
                  </div>
                )}
                <div className="mt-4">
                  <TextArea
                    label="Ayrıntılar"
                    name="body"
                    minLength={tur === 'ilham' ? 100 : tur === 'deneyim' ? 40 : 20}
                    maxLength={15000}
                    rows={8}
                    required
                    hint={
                      tur === 'deneyim'
                        ? 'Neyi nasıl uyguladın, ne işe yaradı, neyi değiştirirdin?'
                        : tur === 'soru'
                          ? 'Mekân, misafir sayısı ve kararsız kaldığın noktayı yaz.'
                          : undefined
                    }
                  />
                </div>
              </CreationStep>
              {tur === 'deneyim' && (
                <CreationStep number="5" title="İşe yarayan ayrıntılar (isteğe bağlı)">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold">
                      Şehir
                      <Input name="city" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Mekân
                      <Input name="venueType" placeholder="Evde, bahçede…" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Yaş / dönem
                      <Input name="ageLabel" placeholder="1 yaş" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Misafir sayısı
                      <Input name="guestCount" type="number" min={1} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Tema yorumu
                      <Input name="themeVariation" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Renkler
                      <Input name="colors" placeholder="Krem, kahve, adaçayı" />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Bütçe aralığı
                      <Input name="budgetLabel" />
                    </label>
                  </div>
                  <label className="mt-4 grid gap-2 text-sm font-semibold">
                    İpucun
                    <Input name="tips" />
                  </label>
                  <label className="mt-4 grid gap-2 text-sm font-semibold">
                    En iyi ne çalıştı?
                    <Input name="whatWorked" />
                  </label>
                  <label className="mt-4 grid gap-2 text-sm font-semibold">
                    Neyi değiştirirdin?
                    <Input name="whatWouldChange" />
                  </label>
                </CreationStep>
              )}
              {tur === 'anket' && (
                <label className="grid gap-2 text-sm font-semibold">
                  Seçenekler{' '}
                  <span className="font-normal text-[var(--muted)]">
                    Her satıra bir seçenek, en az iki
                  </span>
                  <textarea name="options" rows={5} required className="field field-textarea" />
                </label>
              )}
              <CreationStep
                number={tur === 'deneyim' ? '6' : tur === 'soru' || tur === 'ilham' ? '4' : '2'}
                title="Kontrol et ve gönder"
              >
                <label className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4 text-sm leading-6">
                  <input
                    name={
                      tur === 'deneyim' || tur === 'ilham' ? 'rightsConfirmed' : 'rulesConfirmed'
                    }
                    type="checkbox"
                    required
                    className="mt-1"
                  />
                  <span>
                    {tur === 'deneyim' || tur === 'ilham'
                      ? 'Görsellerin bana ait olduğunu veya paylaşma iznim bulunduğunu; çocukların ve özel kişilerin mahremiyetini gözettiğimi onaylıyorum.'
                      : 'Topluluk kurallarına uyduğumu ve kişisel bilgi paylaşmadığımı onaylıyorum.'}
                  </span>
                </label>
                <Button type="submit" className="mt-4 w-full">
                  {tur === 'deneyim' || tur === 'ilham'
                    ? 'Editör incelemesine gönder'
                    : 'Toplulukla paylaş'}
                </Button>
              </CreationStep>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}

function CreationStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-4 flex items-center gap-3 text-lg font-semibold">
        <span className="grid size-8 place-items-center rounded-full bg-[var(--accent-soft)] text-sm text-[var(--accent-strong)]">
          {number}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
