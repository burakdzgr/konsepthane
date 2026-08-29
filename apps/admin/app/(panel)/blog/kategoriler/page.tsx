import Link from 'next/link';
import { Badge, Input, Select, TextArea, TextInput } from '@ilham/ui';
import { toTurkishSlug } from '@ilham/validation';
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

type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  sortOrder: number;
  postCount: number;
  updatedAt: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Taslak',
  IN_REVIEW: 'İncelemede',
  PUBLISHED: 'Yayında',
  ARCHIVED: 'Arşiv',
};

function categoryPayload(formData: FormData) {
  const name = formString(formData, 'name');
  const sortOrder = Number.parseInt(formString(formData, 'sortOrder') || '0', 10);
  return {
    name,
    slug: toTurkishSlug(formString(formData, 'slug') || name),
    description: formString(formData, 'description') || null,
    status: formString(formData, 'status'),
    sortOrder: Number.isFinite(sortOrder) ? Math.max(0, sortOrder) : 0,
  };
}

async function createCategory(formData: FormData) {
  'use server';
  await runAdminAction(
    '/blog/kategoriler',
    async () => {
      await adminApi('/blog/admin/categories', {
        method: 'POST',
        body: JSON.stringify(categoryPayload(formData)),
      });
    },
    'Blog kategorisi oluşturuldu.',
  );
}
async function updateCategory(formData: FormData) {
  'use server';
  await runAdminAction('/blog/kategoriler', async () => {
    await adminApi(`/blog/admin/categories/${formString(formData, 'id')}`, {
      method: 'PATCH',
      body: JSON.stringify(categoryPayload(formData)),
    });
  });
}
async function deleteCategory(formData: FormData) {
  'use server';
  await runAdminAction(
    '/blog/kategoriler',
    async () => {
      await adminApi(`/blog/admin/categories/${formString(formData, 'id')}`, { method: 'DELETE' });
    },
    'Blog kategorisi silindi (yazılar kategorisiz kaldı).',
  );
}

const statusOptions = (
  <>
    <option value="PUBLISHED">Yayında</option>
    <option value="DRAFT">Taslak</option>
    <option value="ARCHIVED">Arşiv</option>
  </>
);

function CategoryFields({ category }: { category?: BlogCategory }) {
  return (
    <>
      <TextInput
        label="Ad"
        name="name"
        defaultValue={category?.name}
        required
        minLength={2}
        maxLength={140}
      />
      <label>
        Kısa ad <span className="font-normal text-[var(--muted)]">(boşsa otomatik)</span>
        <Input name="slug" defaultValue={category?.slug} maxLength={160} />
      </label>
      <label>
        Durum
        <Select name="status" defaultValue={category?.status ?? 'PUBLISHED'}>
          {statusOptions}
        </Select>
      </label>
      <label>
        Sıra
        <Input
          name="sortOrder"
          type="number"
          min={0}
          max={9999}
          defaultValue={category?.sortOrder ?? 0}
        />
      </label>
      <div className="lg:col-span-4">
        <TextArea
          label="Açıklama"
          name="description"
          defaultValue={category?.description ?? ''}
          maxLength={5000}
          rows={3}
          hint="Kategori sayfasının giriş metni ve meta açıklaması; isteğe bağlı."
        />
      </div>
    </>
  );
}

export default async function BlogCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { yeni?: string }>;
}) {
  const [{ mesaj, hata, yeni }, result] = await Promise.all([
    searchParams,
    adminApi<{ data: BlogCategory[] }>('/blog/admin/categories'),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="İçerik üretimi · Blog"
        title="Blog kategorileri"
        description="Blog yazılarının sınıflandırması (konsept kategorilerinden bağımsız). Yayındaki kategoriler blog ana sayfasında filtre olarak görünür."
      />
      <WorkflowHint
        steps={[
          'Kategori adını ve kısa açıklamasını girin.',
          'Sıra değeriyle filtre çubuğundaki yerini belirleyin.',
          'Yazıları bağladıktan sonra kategori sayfası sitemap’e girer.',
        ]}
      />
      <div className="mt-6">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Yazılara dönmek için{' '}
        <Link href="/blog" className="font-semibold text-[var(--accent-strong)]">
          Blog yazıları
        </Link>
        .
      </p>
      <CreatePanel
        title="Yeni blog kategorisi"
        description="Örnek: Planlama, Trendler, DIY, Pasta & Sunum."
        open={yeni === '1'}
      >
        <form action={createCategory} className="grid gap-4 lg:grid-cols-4">
          <CategoryFields />
          <div className="lg:col-span-4 flex gap-3">
            <SubmitButton type="submit" pendingText="Ekleniyor…">
              Kategori ekle
            </SubmitButton>
          </div>
        </form>
      </CreatePanel>
      <RecordCollection
        count={result.data.length}
        label="Mevcut blog kategorileri"
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
              <div className="flex flex-wrap items-center gap-2">
                <strong>{category.name}</strong>
                <span className="text-xs text-[var(--muted)]">/blog/kategori/{category.slug}</span>
                <Badge>{statusLabel[category.status] ?? category.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {category.postCount} yazı · Sıra {category.sortOrder} · Düzenlemek için açın
              </p>
            </summary>
            <div className="admin-record-body">
              <form action={updateCategory} className="grid gap-4 lg:grid-cols-4">
                <input type="hidden" name="id" value={category.id} />
                <CategoryFields category={category} />
                <div className="lg:col-span-4 flex gap-3">
                  <SubmitButton>Değişiklikleri kaydet</SubmitButton>
                </div>
              </form>
              <form
                action={deleteCategory}
                className="mt-4 flex justify-end border-t border-[var(--line)] pt-4"
              >
                <input type="hidden" name="id" value={category.id} />
                <ConfirmButton
                  confirmMessage={`“${category.name}” kategorisini silmek istediğinizden emin misiniz? Yazılar silinmez, kategorisiz kalır.`}
                >
                  Kategoriyi sil
                </ConfirmButton>
              </form>
            </div>
          </details>
        ))}
      </RecordCollection>
    </>
  );
}
