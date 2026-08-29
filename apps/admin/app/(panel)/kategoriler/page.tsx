import { Input, Select, TextArea, TextInput } from '@ilham/ui';
import { toTurkishSlug } from '@ilham/validation';
import type { CategorySummary, Paginated } from '@ilham/shared-types';
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

async function createCategory(formData: FormData) {
  'use server';
  const name = formString(formData, 'name');
  await runAdminAction(
    '/kategoriler',
    async () => {
      await adminApi('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: toTurkishSlug(formString(formData, 'slug') || name),
          description: formString(formData, 'description') || undefined,
          status: formString(formData, 'status'),
        }),
      });
    },
    'Kategori oluşturuldu.',
  );
}
async function updateCategory(formData: FormData) {
  'use server';
  await runAdminAction('/kategoriler', async () => {
    await adminApi(`/categories/${formString(formData, 'id')}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: formString(formData, 'name'),
        slug: toTurkishSlug(formString(formData, 'slug')),
        description: formString(formData, 'description') || undefined,
        status: formString(formData, 'status'),
      }),
    });
  });
}
async function deleteCategory(formData: FormData) {
  'use server';
  await runAdminAction(
    '/kategoriler',
    async () => {
      await adminApi(`/categories/${formString(formData, 'id')}`, { method: 'DELETE' });
    },
    'Kategori silindi.',
  );
}

const statusOptions = (
  <>
    <option value="DRAFT">Taslak</option>
    <option value="IN_REVIEW">İncelemede</option>
    <option value="PUBLISHED">Yayında</option>
    <option value="ARCHIVED">Arşiv</option>
  </>
);

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { yeni?: string }>;
}) {
  const [{ mesaj, hata, yeni }, result] = await Promise.all([
    searchParams,
    adminApi<Paginated<CategorySummary>>('/categories/admin/all?pageSize=100'),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="İçerik üretimi · Taksonomi"
        title="Kategoriler"
        description="Konseptlerin ana sınıflandırmasını buradan yönetin. Yeni kategoriyi önce taslak açın; açıklama ve bağlantıyı kontrol ettikten sonra yayımlayın."
      />
      <WorkflowHint
        steps={[
          'Kategori adını ve kısa açıklamasını girin.',
          'Otomatik kısa adı kontrol edip taslak olarak kaydedin.',
          'İçerikler bağlandıktan sonra yayına alın.',
        ]}
      />
      <div className="mt-6">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <CreatePanel
        title="Yeni kategori oluştur"
        description="Ana menüde ve kategori sayfalarında kullanılacak yeni sınıflandırma."
        open={yeni === '1'}
      >
        <form action={createCategory} className="grid gap-4 lg:grid-cols-4">
          <TextInput label="Ad" name="name" required minLength={2} maxLength={140} />
          <label>
            Kısa ad <span className="font-normal text-[var(--muted)]">(boşsa otomatik)</span>
            <Input name="slug" maxLength={160} />
          </label>
          <label>
            Durum
            <Select name="status" defaultValue="DRAFT">
              {statusOptions}
            </Select>
          </label>
          <div className="form-action">
            <SubmitButton className="w-full" type="submit" pendingText="Ekleniyor…">
              Kategori ekle
            </SubmitButton>
          </div>
          <div className="lg:col-span-4">
            <TextArea
              label="Açıklama"
              name="description"
              maxLength={5000}
              rows={3}
              hint="Kategori sayfasının giriş metni; isteğe bağlı."
            />
          </div>
        </form>
      </CreatePanel>
      <RecordCollection
        count={result.data.length}
        label="Mevcut kategoriler"
        placeholder="Kategori adı veya kısa ad ara…"
      >
        {result.data.map((category) => (
          <details
            key={category.id}
            className="admin-record-card"
            data-admin-record
            data-search={`${category.name} ${category.slug} ${category.status}`}
          >
            <summary>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong>{category.name}</strong>
                  <span className="ml-2 text-xs text-[var(--muted)]">/{category.slug}</span>
                </div>
                <span className="rounded-full bg-[var(--paper-3)] px-3 py-1 text-xs font-semibold">
                  {category.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {category.conceptCount} bağlı konsept · Düzenlemek için açın
              </p>
            </summary>
            <div className="admin-record-body">
              <form
                action={updateCategory}
                className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto]"
              >
                <input type="hidden" name="id" value={category.id} />
                <TextInput
                  label="Ad"
                  name="name"
                  defaultValue={category.name}
                  required
                  minLength={2}
                  maxLength={140}
                />
                <label>
                  Kısa ad
                  <Input name="slug" defaultValue={category.slug} required maxLength={160} />
                </label>
                <label>
                  Durum
                  <Select name="status" defaultValue={category.status}>
                    {statusOptions}
                  </Select>
                </label>
                <div className="form-action">
                  <SubmitButton className="w-full">Değişiklikleri kaydet</SubmitButton>
                </div>
                <div className="lg:col-span-4">
                  <TextArea
                    label="Açıklama"
                    name="description"
                    defaultValue={category.description ?? ''}
                    maxLength={5000}
                    rows={3}
                  />
                </div>
              </form>
              <form
                action={deleteCategory}
                className="mt-4 flex justify-end border-t border-[var(--line)] pt-4"
              >
                <input type="hidden" name="id" value={category.id} />
                <ConfirmButton
                  confirmMessage={`“${category.name}” kategorisini kalıcı olarak silmek istediğinizden emin misiniz?`}
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
