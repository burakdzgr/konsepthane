import { Badge, Input, Select, TextArea, TextInput } from '@ilham/ui';
import { toTurkishSlug } from '@ilham/validation';
import { RichTextField } from '@/components/rich-text-field';
import { Flash } from '@/components/flash';
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

type AdminGuide = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  status: string;
  indexability: string;
  featured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  author: { id: string; profile: { displayName: string; username: string | null } | null } | null;
};
type EditorOption = {
  id: string;
  profile: { displayName: string; username: string | null } | null;
};

const publicUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const statusLabel: Record<string, string> = {
  DRAFT: 'Taslak',
  IN_REVIEW: 'İncelemede',
  PUBLISHED: 'Yayında',
  ARCHIVED: 'Arşiv',
};

function guidePayload(formData: FormData) {
  const title = formString(formData, 'title');
  return {
    title,
    slug: toTurkishSlug(formString(formData, 'slug') || title),
    summary: formString(formData, 'summary'),
    body: formString(formData, 'body'),
    status: formString(formData, 'status'),
    indexability: formString(formData, 'indexability') || undefined,
    featured: formData.get('featured') === 'on',
    authorId: formString(formData, 'authorId') || undefined,
  };
}

async function createGuide(formData: FormData) {
  'use server';
  await runAdminAction(
    '/rehberler',
    async () => {
      await adminApi('/guides', { method: 'POST', body: JSON.stringify(guidePayload(formData)) });
    },
    'Rehber oluşturuldu.',
  );
}
async function updateGuide(formData: FormData) {
  'use server';
  await runAdminAction('/rehberler', async () => {
    await adminApi(`/guides/${formString(formData, 'id')}`, {
      method: 'PATCH',
      body: JSON.stringify(guidePayload(formData)),
    });
  });
}
async function deleteGuide(formData: FormData) {
  'use server';
  await runAdminAction(
    '/rehberler',
    async () => {
      await adminApi(`/guides/${formString(formData, 'id')}`, { method: 'DELETE' });
    },
    'Rehber silindi.',
  );
}

function GuideForm({ guide, editors }: { guide?: AdminGuide; editors: EditorOption[] }) {
  return (
    <form action={guide ? updateGuide : createGuide} className="grid gap-4 lg:grid-cols-2">
      {guide && <input type="hidden" name="id" value={guide.id} />}
      <TextInput
        label="Başlık"
        name="title"
        defaultValue={guide?.title}
        required
        minLength={4}
        maxLength={180}
      />
      <label>
        Kısa ad <span className="font-normal text-[var(--muted)]">(boşsa otomatik)</span>
        <Input name="slug" defaultValue={guide?.slug} />
      </label>
      <label>
        Yazar (byline){' '}
        <span className="font-normal text-[var(--muted)]">(boşsa: editörseniz siz)</span>
        <Select name="authorId" defaultValue={guide?.author?.id ?? ''}>
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
          <Select name="status" defaultValue={guide?.status ?? 'DRAFT'}>
            <option value="DRAFT">Taslak</option>
            <option value="IN_REVIEW">İncelemede</option>
            <option value="PUBLISHED">Yayında</option>
            <option value="ARCHIVED">Arşiv</option>
          </Select>
        </label>
        <label>
          İndeksleme
          <Select name="indexability" defaultValue={guide?.indexability ?? 'INDEX'}>
            <option value="INDEX">Index</option>
            <option value="NOINDEX">Noindex</option>
            <option value="PENDING">Bekliyor</option>
          </Select>
        </label>
      </div>
      <div className="lg:col-span-2">
        <TextArea
          label="Özet"
          name="summary"
          defaultValue={guide?.summary}
          required
          minLength={10}
          maxLength={320}
          rows={2}
          hint="Kart ve meta açıklaması; tek paragraf."
        />
      </div>
      <div className="lg:col-span-2">
        <RichTextField
          label="İçerik"
          name="body"
          defaultValue={guide?.body}
          required
          minLength={20}
          maxLength={60000}
        />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="featured" defaultChecked={guide?.featured} /> Öne çıkan
      </label>
      <div className="lg:col-span-2 flex gap-3">
        <SubmitButton type="submit" pendingText="Rehber kaydediliyor…">
          {guide ? 'Değişiklikleri kaydet' : 'Taslak rehber oluştur'}
        </SubmitButton>
      </div>
    </form>
  );
}

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { yeni?: string }>;
}) {
  const [{ mesaj, hata, yeni }, guides, editors] = await Promise.all([
    searchParams,
    adminApi<{ data: AdminGuide[] }>('/guides/admin/all?pageSize=100'),
    adminApi<{ data: EditorOption[] }>('/users/editor-options'),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="İçerik üretimi · Editoryal"
        title="Rehberler"
        description="Okuyucuya uygulanabilir yol haritası sunan uzun içerikleri oluşturun. Yazar, yayın ve indeksleme kararları aynı kayıtta kontrol edilir."
      />
      <WorkflowHint
        steps={[
          'Başlık, özet ve ana metinle taslağı başlatın.',
          'Gerçek editör byline’ını seçip metni incelemeye gönderin.',
          'Önizleme doğrulandıktan sonra yayın ve index durumunu açın.',
        ]}
      />
      <div className="mt-6">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <CreatePanel
        title="Yeni rehber oluştur"
        description="Yeni rehber taslak olarak kaydedilir ve yayın öncesi inceleme bekler."
        open={yeni === '1'}
      >
        <GuideForm editors={editors.data} />
      </CreatePanel>
      <RecordCollection
        count={guides.data.length}
        label="Rehber envanteri"
        placeholder="Başlık, yazar veya durum ara…"
      >
        {guides.data.map((guide) => (
          <details
            key={guide.id}
            className="admin-record-card"
            data-admin-record
            data-search={`${guide.title} ${guide.slug} ${guide.status} ${guide.author?.profile?.displayName ?? ''}`}
          >
            <summary>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{guide.title}</strong>
                <Badge>{statusLabel[guide.status] ?? guide.status}</Badge>
                {guide.status === 'PUBLISHED' && (
                  <a
                    href={`${publicUrl}/tr/rehber/${guide.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-xs font-semibold text-[var(--accent-strong)]"
                  >
                    Önizle ↗
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {guide.author?.profile?.displayName ?? 'Konsepthane Editörleri'} · Son değişiklik{' '}
                {new Date(guide.updatedAt).toLocaleDateString('tr-TR')} · Düzenlemek için açın
              </p>
            </summary>
            <div className="admin-record-body">
              <GuideForm guide={guide} editors={editors.data} />
              <form
                action={deleteGuide}
                className="mt-4 flex justify-end border-t border-[var(--line)] pt-4"
              >
                <input type="hidden" name="id" value={guide.id} />
                <ConfirmButton
                  confirmMessage={`“${guide.title}” rehberini silmek istediğinizden emin misiniz?`}
                >
                  Rehberi kalıcı olarak sil
                </ConfirmButton>
              </form>
            </div>
          </details>
        ))}
      </RecordCollection>
    </>
  );
}
