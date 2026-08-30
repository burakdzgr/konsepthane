import { Badge, Input, Select, TextArea, TextInput } from '@ilham/ui';
import { toTurkishSlug } from '@ilham/validation';
import type { CategorySummary, ConceptDetail, Paginated } from '@ilham/shared-types';
import { Flash } from '@/components/flash';
import { GalleryUploadField, ImageUploadField } from '@/components/image-upload';
import { RichTextField } from '@/components/rich-text-field';
import { runAdminAction, type FlashParams } from '@/lib/actions';
import { adminApi } from '@/lib/api';
import { formString } from '@/lib/form';
import {
  ConfirmButton,
  CreatePanel,
  PageHeader,
  RecordCollection,
  SubmitButton,
  WorkflowHint,
} from '@/components/admin-ui';

type AdminConcept = ConceptDetail & {
  featured?: boolean;
  indexability?: string;
  images?: Array<{ id: string; url: string; altText: string; sortOrder: number }>;
};

const publicUrl = process.env.WEB_URL ?? 'http://localhost:3000';

const editorialFields: Array<[keyof ConceptDetail, string, string]> = [
  ['introduction', 'Giriş (editoryal lead)', 'Konseptin okuyucuya ilk cümlede ne vaat ettiği.'],
  ['decorationIdeas', 'Dekorasyon fikirleri', 'Fon, dokular, figürler.'],
  ['tableSetup', 'Masa düzeni', 'Örtü, servis, isimlikler.'],
  ['balloonIdeas', 'Balon fikirleri', 'Renkler, yoğunluk, yerleşim.'],
  ['cakeIdeas', 'Pasta ilhamı', 'Kat, doku, figür.'],
  ['venueSuggestions', 'Mekân önerileri', 'Ev, salon, bahçe ölçüleri.'],
  ['practicalTips', 'Pratik ipuçları', 'Zamanlama, prova, yedekler.'],
  ['alternatives', 'Alternatif yorumlar', 'Bütçe dostu ya da modern varyasyonlar.'],
];

function parseLines(value: string, separator: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(separator);
      return index === -1
        ? [line, '']
        : [line.slice(0, index).trim(), line.slice(index + separator.length).trim()];
    });
}

/** Gallery field submits `[{ url, altText }]` as JSON (see GalleryUploadField). */
function parseGallery(value: string): Array<{ url: string; altText: string }> {
  try {
    const parsed = JSON.parse(value || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is { url: string; altText?: string } =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as { url?: unknown }).url === 'string',
      )
      .map((entry) => ({
        url: entry.url,
        altText: (entry.altText ?? '').trim() || 'Konsept görseli',
      }));
  } catch {
    return [];
  }
}

function conceptPayload(formData: FormData) {
  const title = formString(formData, 'title');
  return {
    categoryId: formString(formData, 'categoryId'),
    title,
    slug: toTurkishSlug(formString(formData, 'slug') || title),
    summary: formString(formData, 'summary'),
    description: formString(formData, 'description'),
    status: formString(formData, 'status'),
    heroImageUrl: formString(formData, 'heroImageUrl') || undefined,
    heroImageAlt: formString(formData, 'heroImageAlt') || undefined,
    budgetMin: Number(formData.get('budgetMin')) || undefined,
    budgetMax: Number(formData.get('budgetMax')) || undefined,
    featured: formData.get('featured') === 'on',
    authorId: formString(formData, 'authorId') || undefined,
    indexability: formString(formData, 'indexability') || undefined,
    introduction: formString(formData, 'introduction') || undefined,
    decorationIdeas: formString(formData, 'decorationIdeas') || undefined,
    tableSetup: formString(formData, 'tableSetup') || undefined,
    balloonIdeas: formString(formData, 'balloonIdeas') || undefined,
    cakeIdeas: formString(formData, 'cakeIdeas') || undefined,
    venueSuggestions: formString(formData, 'venueSuggestions') || undefined,
    practicalTips: formString(formData, 'practicalTips') || undefined,
    alternatives: formString(formData, 'alternatives') || undefined,
    colorPalette: parseLines(formString(formData, 'colorPalette'), '=').map(([name, hex]) => ({
      name,
      hex,
    })),
    faq: parseLines(formString(formData, 'faq'), '?').map(([question, answer]) => ({
      question: `${question}?`,
      answer,
    })),
    images: parseGallery(formString(formData, 'images')),
  };
}

async function createConcept(formData: FormData) {
  'use server';
  await runAdminAction(
    '/konseptler',
    async () => {
      await adminApi('/concepts', {
        method: 'POST',
        body: JSON.stringify(conceptPayload(formData)),
      });
    },
    'Konsept oluşturuldu.',
  );
}
async function updateConcept(formData: FormData) {
  'use server';
  await runAdminAction('/konseptler', async () => {
    await adminApi(`/concepts/${formString(formData, 'id')}`, {
      method: 'PATCH',
      body: JSON.stringify(conceptPayload(formData)),
    });
  });
}
async function deleteConcept(formData: FormData) {
  'use server';
  await runAdminAction(
    '/konseptler',
    async () => {
      await adminApi(`/concepts/${formString(formData, 'id')}`, { method: 'DELETE' });
    },
    'Konsept silindi.',
  );
}

type EditorOption = {
  id: string;
  profile: { displayName: string; username: string | null } | null;
};

function ConceptForm({
  concept,
  categories,
  editors,
}: {
  concept?: AdminConcept;
  categories: CategorySummary[];
  editors: EditorOption[];
}) {
  return (
    <form action={concept ? updateConcept : createConcept} className="grid gap-4 lg:grid-cols-2">
      {concept && <input type="hidden" name="id" value={concept.id} />}
      <TextInput
        label="Başlık"
        name="title"
        defaultValue={concept?.title}
        required
        minLength={4}
        maxLength={180}
      />
      <label>
        Kısa ad <span className="font-normal text-[var(--muted)]">(boşsa otomatik)</span>
        <Input name="slug" defaultValue={concept?.slug} />
      </label>
      <label>
        Kategori
        <Select name="categoryId" defaultValue={concept?.category.id} required>
          {categories.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </Select>
      </label>
      <label>
        Yazar (byline){' '}
        <span className="font-normal text-[var(--muted)]">
          (boşsa: editörseniz siz, değilse &quot;Konsepthane Editörleri&quot;)
        </span>
        <Select name="authorId" defaultValue={concept?.author?.id ?? ''}>
          <option value="">— Editör seçilmedi —</option>
          {editors.map((editor) => (
            <option key={editor.id} value={editor.id}>
              {editor.profile?.displayName ?? editor.id}
              {editor.profile?.username ? ` (@${editor.profile.username})` : ''}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          Durum
          <Select name="status" defaultValue={concept?.status ?? 'DRAFT'}>
            <option value="DRAFT">Taslak</option>
            <option value="IN_REVIEW">İncelemede</option>
            <option value="PUBLISHED">Yayında</option>
            <option value="ARCHIVED">Arşiv</option>
          </Select>
        </label>
        <label>
          İndeksleme
          <Select name="indexability" defaultValue={concept?.indexability ?? 'INDEX'}>
            <option value="INDEX">Index</option>
            <option value="NOINDEX">Noindex</option>
            <option value="PENDING">Bekliyor</option>
          </Select>
        </label>
      </div>
      <div className="lg:col-span-2">
        <TextArea
          label="Özet (kart ve meta açıklaması)"
          name="summary"
          defaultValue={concept?.summary}
          required
          minLength={10}
          maxLength={320}
          rows={3}
          hint="Arama sonuçları ve kartlarda görünür; tek paragraf."
        />
      </div>
      <div className="lg:col-span-2">
        <RichTextField
          label="Konsept anlatımı"
          name="description"
          defaultValue={concept?.description}
          required
          minLength={20}
          maxLength={30000}
        />
      </div>
      <ImageUploadField
        name="heroImageUrl"
        label="Kapak görseli"
        defaultValue={concept?.heroImageUrl ?? ''}
        hint="Kart ve sayfa başlığında kullanılır; boşsa galerinin ilk görseli kapak olur."
      />
      <label>
        Kapak alt metni
        <Input name="heroImageAlt" defaultValue={concept?.heroImageAlt ?? ''} />
      </label>
      <label>
        Minimum bütçe
        <Input name="budgetMin" type="number" min="0" defaultValue={concept?.budgetMin ?? ''} />
      </label>
      <label>
        Maksimum bütçe
        <Input name="budgetMax" type="number" min="0" defaultValue={concept?.budgetMax ?? ''} />
      </label>
      <label className="flex items-center gap-2 lg:col-span-2">
        <input type="checkbox" name="featured" defaultChecked={concept?.featured ?? false} />
        Ana sayfada “Editörün seçimi” olarak öne çıkar
      </label>
      <details className="lg:col-span-2 rounded-2xl border border-[var(--line)] bg-white p-4">
        <summary className="cursor-pointer font-semibold">Editoryal bölümler</summary>
        <div className="mt-4 grid gap-4">
          {editorialFields.map(([field, label, hint]) => (
            <RichTextField
              key={field}
              name={field}
              label={label}
              hint={hint}
              defaultValue={(concept?.[field] as string | null) ?? ''}
              maxLength={field === 'introduction' ? 5000 : 20000}
            />
          ))}
          <label>
            Renk paleti{' '}
            <span className="font-normal text-[var(--muted)]">— her satır: Ad = #hex</span>
            <textarea
              name="colorPalette"
              defaultValue={(concept?.colorPalette ?? [])
                .map((entry) => `${entry.name} = ${entry.hex}`)
                .join('\n')}
            />
          </label>
          <label>
            SSS <span className="font-normal text-[var(--muted)]">— her satır: Soru? Yanıt</span>
            <textarea
              name="faq"
              defaultValue={(concept?.faq ?? [])
                .map((entry) => `${entry.question.replace(/\?$/, '')}? ${entry.answer}`)
                .join('\n')}
            />
          </label>
          <GalleryUploadField
            name="images"
            label="Galeri görselleri"
            defaultValue={(concept?.images ?? []).map((entry) => ({
              url: entry.url,
              altText: entry.altText,
            }))}
            hint="Sıra sayfadaki galeri sırasıdır; her görsel için alt metin girin."
          />
        </div>
      </details>
      <div className="lg:col-span-2">
        <SubmitButton type="submit" pendingText="Konsept kaydediliyor…">
          {concept ? 'Değişiklikleri kaydet' : 'Taslak konsept oluştur'}
        </SubmitButton>
      </div>
    </form>
  );
}

export default async function ConceptsPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { yeni?: string }>;
}) {
  const [{ mesaj, hata, yeni }, result, categories, editors] = await Promise.all([
    searchParams,
    adminApi<Paginated<AdminConcept>>('/concepts/admin/all?pageSize=100'),
    adminApi<Paginated<CategorySummary>>('/categories/admin/all?pageSize=100'),
    adminApi<{ data: EditorOption[] }>('/users/editor-options'),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="İçerik üretimi · Ana içerik"
        title="Konseptler"
        description="Konsepthane’nin ana keşif içeriklerini oluşturun. Temel alanlar önce, isteğe bağlı editoryal ayrıntılar ikinci adımda girilir."
      />
      <WorkflowHint
        steps={[
          'Başlık, kategori, özet ve ana anlatımla taslağı oluşturun.',
          'Görsel, yazar ve editoryal bölümleri tamamlayıp önizleyin.',
          'İnceleme sonrasında yayın ve indeksleme durumunu birlikte açın.',
        ]}
      />
      <div className="mt-6">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <CreatePanel
        title="Yeni konsept oluştur"
        description="Yeni kayıt güvenli varsayılanlarla taslak olarak başlar."
        open={yeni === '1'}
      >
        <ConceptForm categories={categories.data} editors={editors.data} />
      </CreatePanel>
      <RecordCollection
        count={result.data.length}
        label="Konsept envanteri"
        placeholder="Başlık, kategori veya durum ara…"
      >
        {result.data.map((concept) => (
          <details
            key={concept.id}
            className="admin-record-card"
            data-admin-record
            data-search={`${concept.title} ${concept.slug} ${concept.category.name} ${concept.status}`}
          >
            <summary>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{concept.title}</strong>
                <Badge>{concept.status}</Badge>
                {concept.featured && (
                  <Badge className="bg-amber-50 text-amber-800">Öne çıkan</Badge>
                )}
                <a
                  href={`${publicUrl}/tr/konsept/${concept.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-xs font-semibold text-[var(--accent-strong)]"
                >
                  Önizle ↗
                </a>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {concept.category.name} · {concept.experienceCount} deneyim ·{' '}
                {concept.questionCount} soru · {concept.saveCount} kaydetme · Düzenlemek için açın
              </p>
            </summary>
            <div className="admin-record-body">
              <ConceptForm concept={concept} categories={categories.data} editors={editors.data} />
              <form
                action={deleteConcept}
                className="mt-4 flex justify-end border-t border-[var(--line)] pt-4"
              >
                <input type="hidden" name="id" value={concept.id} />
                <ConfirmButton
                  confirmMessage={`“${concept.title}” konseptini kalıcı olarak silmek istediğinizden emin misiniz?`}
                >
                  Kalıcı olarak sil
                </ConfirmButton>
              </form>
            </div>
          </details>
        ))}
      </RecordCollection>
    </>
  );
}
