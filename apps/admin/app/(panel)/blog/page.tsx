import Link from 'next/link';
import { Badge, Input, Select, TextArea, TextInput } from '@ilham/ui';
import { toTurkishSlug } from '@ilham/validation';
import { Flash } from '@/components/flash';
import { ImageUploadField } from '@/components/image-upload';
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

type AdminBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: string;
  indexability: string;
  featured: boolean;
  tags: string[];
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  readingMinutes: number;
  viewCount: number;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  publishedAt: string | null;
  updatedAt: string;
  author: { id: string; profile: { displayName: string; username: string | null } | null } | null;
};
type BlogCategoryOption = { id: string; name: string; slug: string; status: string };
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

/** `datetime-local` values are read as Türkiye time (UTC+3); stored as ISO. */
function localToIso(value: string) {
  if (!value) return null;
  return new Date(`${value}:00+03:00`).toISOString();
}
function isoToLocal(value: string | null) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
const formatDate = (value: string) =>
  new Date(value).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

function postPayload(formData: FormData) {
  const title = formString(formData, 'title');
  return {
    title,
    slug: toTurkishSlug(formString(formData, 'slug') || title),
    excerpt: formString(formData, 'excerpt'),
    body: formString(formData, 'body'),
    categoryId: formString(formData, 'categoryId') || null,
    coverImageUrl: formString(formData, 'coverImageUrl') || null,
    coverImageAlt: formString(formData, 'coverImageAlt') || null,
    tags: formString(formData, 'tags')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    status: formString(formData, 'status'),
    indexability: formString(formData, 'indexability') || undefined,
    featured: formData.get('featured') === 'on',
    seoTitle: formString(formData, 'seoTitle') || null,
    seoDescription: formString(formData, 'seoDescription') || null,
    publishedAt: localToIso(formString(formData, 'publishedAt')),
    authorId: formString(formData, 'authorId') || undefined,
  };
}

async function createPost(formData: FormData) {
  'use server';
  await runAdminAction(
    '/blog',
    async () => {
      await adminApi('/blog/admin/posts', {
        method: 'POST',
        body: JSON.stringify(postPayload(formData)),
      });
    },
    'Blog yazısı oluşturuldu.',
  );
}
async function updatePost(formData: FormData) {
  'use server';
  await runAdminAction('/blog', async () => {
    await adminApi(`/blog/admin/posts/${formString(formData, 'id')}`, {
      method: 'PATCH',
      body: JSON.stringify(postPayload(formData)),
    });
  });
}
async function deletePost(formData: FormData) {
  'use server';
  await runAdminAction(
    '/blog',
    async () => {
      await adminApi(`/blog/admin/posts/${formString(formData, 'id')}`, { method: 'DELETE' });
    },
    'Blog yazısı silindi.',
  );
}

function PostForm({
  post,
  categories,
  editors,
}: {
  post?: AdminBlogPost;
  categories: BlogCategoryOption[];
  editors: EditorOption[];
}) {
  return (
    <form action={post ? updatePost : createPost} className="grid gap-4 lg:grid-cols-2">
      {post && <input type="hidden" name="id" value={post.id} />}
      <TextInput
        label="Başlık"
        name="title"
        defaultValue={post?.title}
        required
        minLength={4}
        maxLength={180}
      />
      <label>
        Kısa ad <span className="font-normal text-[var(--muted)]">(boşsa otomatik)</span>
        <Input name="slug" defaultValue={post?.slug} maxLength={200} />
      </label>
      <label>
        Kategori
        <Select name="categoryId" defaultValue={post?.categoryId ?? ''}>
          <option value="">— Kategori yok —</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.status !== 'PUBLISHED'
                ? ` (${statusLabel[category.status] ?? category.status})`
                : ''}
            </option>
          ))}
        </Select>
      </label>
      <label>
        Yazar (byline){' '}
        <span className="font-normal text-[var(--muted)]">(boşsa: editörseniz siz)</span>
        <Select name="authorId" defaultValue={post?.author?.id ?? ''}>
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
          <Select name="status" defaultValue={post?.status ?? 'DRAFT'}>
            <option value="DRAFT">Taslak</option>
            <option value="IN_REVIEW">İncelemede</option>
            <option value="PUBLISHED">Yayında</option>
            <option value="ARCHIVED">Arşiv</option>
          </Select>
        </label>
        <label>
          İndeksleme
          <Select name="indexability" defaultValue={post?.indexability ?? 'INDEX'}>
            <option value="INDEX">Index</option>
            <option value="NOINDEX">Noindex</option>
          </Select>
        </label>
      </div>
      <label>
        Yayın tarihi{' '}
        <span className="font-normal text-[var(--muted)]">
          (Türkiye saati; ileri tarih = zamanlanmış yayın, boş = yayınlandığı an)
        </span>
        <Input
          name="publishedAt"
          type="datetime-local"
          defaultValue={isoToLocal(post?.publishedAt ?? null)}
        />
      </label>
      <div className="lg:col-span-2">
        <TextArea
          label="Özet"
          name="excerpt"
          defaultValue={post?.excerpt}
          required
          minLength={10}
          maxLength={320}
          rows={2}
          hint="Kart, liste ve varsayılan meta açıklaması; tek paragraf."
        />
      </div>
      <div className="lg:col-span-2">
        <RichTextField
          label="İçerik"
          name="body"
          defaultValue={post?.body}
          required
          minLength={20}
          maxLength={120000}
        />
      </div>
      <div className="lg:col-span-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ImageUploadField
          name="coverImageUrl"
          label="Kapak görseli"
          defaultValue={post?.coverImageUrl ?? ''}
          hint="Liste kartı, yazı başı ve sosyal paylaşım görseli (16:9 önerilir)."
          aspect="16 / 9"
        />
        <div className="grid content-start gap-4">
          <label>
            Kapak alt metni
            <Input name="coverImageAlt" defaultValue={post?.coverImageAlt ?? ''} maxLength={220} />
          </label>
          <label>
            Etiketler{' '}
            <span className="font-normal text-[var(--muted)]">(virgülle ayır, en çok 12)</span>
            <Input
              name="tags"
              defaultValue={post?.tags.join(', ') ?? ''}
              placeholder="balon, pasta, 1 yaş"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured" defaultChecked={post?.featured} /> Öne çıkan
            (blog ana sayfasında büyük kart)
          </label>
        </div>
      </div>
      <label>
        SEO başlığı <span className="font-normal text-[var(--muted)]">(boşsa başlık; ≤ 70)</span>
        <Input name="seoTitle" defaultValue={post?.seoTitle ?? ''} maxLength={70} />
      </label>
      <label>
        SEO açıklaması <span className="font-normal text-[var(--muted)]">(boşsa özet; ≤ 170)</span>
        <Input name="seoDescription" defaultValue={post?.seoDescription ?? ''} maxLength={170} />
      </label>
      <div className="lg:col-span-2 flex gap-3">
        <SubmitButton type="submit" pendingText="Yazı kaydediliyor…">
          {post ? 'Değişiklikleri kaydet' : 'Taslak yazı oluştur'}
        </SubmitButton>
      </div>
    </form>
  );
}

export default async function BlogPostsPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { yeni?: string }>;
}) {
  const [{ mesaj, hata, yeni }, posts, categories, editors] = await Promise.all([
    searchParams,
    adminApi<{ data: AdminBlogPost[] }>('/blog/admin/posts?pageSize=100'),
    adminApi<{ data: BlogCategoryOption[] }>('/blog/admin/categories'),
    adminApi<{ data: EditorOption[] }>('/users/editor-options'),
  ]);
  const now = Date.now();
  return (
    <>
      <PageHeader
        eyebrow="İçerik üretimi · Blog"
        title="Blog yazıları"
        description="Markdown ile yazılan editoryal blog içerikleri. Kapak görseli, kategori, etiket, zamanlanmış yayın ve SEO alanları aynı kayıtta yönetilir."
      />
      <WorkflowHint
        steps={[
          'Başlık, özet ve Markdown içerikle taslağı başlatın; kapak görselini yükleyin.',
          'Kategori, etiket ve yazar byline’ını seçip incelemeye gönderin.',
          'Yayın tarihini belirleyip (isteğe bağlı ileri tarih) durumu “Yayında” yapın.',
        ]}
      />
      <div className="mt-6">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Kategorileri{' '}
        <Link href="/blog/kategoriler" className="font-semibold text-[var(--accent-strong)]">
          Blog kategorileri
        </Link>{' '}
        ekranından yönetin.
      </p>
      <CreatePanel
        title="Yeni blog yazısı"
        description="Yazı taslak olarak kaydedilir; yayına almak için durumu değiştirin."
        open={yeni === '1'}
      >
        <PostForm categories={categories.data} editors={editors.data} />
      </CreatePanel>
      <RecordCollection
        count={posts.data.length}
        label="Blog envanteri"
        placeholder="Başlık, kategori, etiket veya durum ara…"
      >
        {posts.data.map((post) => {
          const scheduled =
            post.status === 'PUBLISHED' &&
            post.publishedAt &&
            new Date(post.publishedAt).getTime() > now;
          return (
            <details
              key={post.id}
              className="admin-record-card"
              data-admin-record
              data-search={`${post.title} ${post.slug} ${post.status} ${post.category?.name ?? ''} ${post.tags.join(' ')} ${post.author?.profile?.displayName ?? ''}`}
            >
              <summary>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{post.title}</strong>
                  <Badge>
                    {scheduled ? 'Zamanlandı' : (statusLabel[post.status] ?? post.status)}
                  </Badge>
                  {post.featured && <Badge>Öne çıkan</Badge>}
                  {post.category && <Badge>{post.category.name}</Badge>}
                  {post.status === 'PUBLISHED' && !scheduled && (
                    <a
                      href={`${publicUrl}/tr/blog/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-xs font-semibold text-[var(--accent-strong)]"
                    >
                      Önizle ↗
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {post.author?.profile?.displayName ?? 'Konsepthane Editörleri'} ·{' '}
                  {post.publishedAt
                    ? `${scheduled ? 'Yayın' : 'Yayınlandı'}: ${formatDate(post.publishedAt)}`
                    : 'Yayın tarihi yok'}{' '}
                  · {post.readingMinutes} dk · {post.viewCount} görüntülenme · Son değişiklik{' '}
                  {formatDate(post.updatedAt)} · Düzenlemek için açın
                </p>
              </summary>
              <div className="admin-record-body">
                <PostForm post={post} categories={categories.data} editors={editors.data} />
                <form
                  action={deletePost}
                  className="mt-4 flex justify-end border-t border-[var(--line)] pt-4"
                >
                  <input type="hidden" name="id" value={post.id} />
                  <ConfirmButton
                    confirmMessage={`“${post.title}” yazısını silmek istediğinizden emin misiniz?`}
                  >
                    Yazıyı kalıcı olarak sil
                  </ConfirmButton>
                </form>
              </div>
            </details>
          );
        })}
      </RecordCollection>
    </>
  );
}
