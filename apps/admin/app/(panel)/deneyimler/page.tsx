import { Badge, Card, EmptyState } from '@ilham/ui';
import { Flash } from '@/components/flash';
import { runAdminAction, type FlashParams } from '@/lib/actions';
import { adminApi } from '@/lib/api';
import { formString } from '@/lib/form';
import { ConfirmButton, PageHeader, RecordCollection, WorkflowHint } from '@/components/admin-ui';
import {
  AuthorIdentity,
  RecordDetail,
  formatDateTime,
  resolveImageUrl,
} from '@/components/record-detail';

const publicUrl = process.env.WEB_URL ?? 'http://localhost:3000';

type ExperienceQueue = {
  data: Array<{
    id: string;
    title: string;
    slug: string;
    body: string;
    summary: string | null;
    status: string;
    indexability: string;
    featured: boolean;
    city: string | null;
    district: string | null;
    venueType: string | null;
    guestCount: number | null;
    ageLabel: string | null;
    budgetLabel: string | null;
    themeVariation: string | null;
    colors: string[];
    tips: string | null;
    whatWorked: string | null;
    whatWouldChange: string | null;
    eventDate: string | null;
    reactionCount: number;
    saveCount: number;
    commentCount: number;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
    author: {
      email?: string;
      status?: string;
      profile: { displayName: string; username?: string | null; kind?: string } | null;
    };
    concept: { title: string; slug: string } | null;
    eventType: { name: string } | null;
    images: Array<{ id: string; url: string; altText: string }>;
  }>;
  meta: { total: number };
};

async function updateExperience(formData: FormData) {
  'use server';
  await runAdminAction('/deneyimler', async () => {
    const id = formString(formData, 'id');
    const operation = formString(formData, 'operation');
    if (operation.startsWith('remove:')) {
      await adminApi(`/community/admin/experiences/${id}/images/${operation.slice(7)}/remove`, {
        method: 'POST',
      });
    } else {
      const payload =
        operation === 'approve'
          ? { status: 'APPROVED' }
          : operation === 'reject'
            ? { status: 'REJECTED' }
            : operation === 'feature'
              ? { featured: true }
              : operation === 'noindex'
                ? { indexability: 'NOINDEX' }
                : { status: 'UNDER_REVIEW' };
      await adminApi(`/community/admin/experiences/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    }
  });
}

export default async function ExperiencesAdminPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  const { mesaj, hata } = await searchParams;
  const queue = await adminApi<ExperienceQueue>('/community/admin/experiences?pageSize=50');
  return (
    <>
      <PageHeader
        eyebrow="İnceleme merkezi · Üye içeriği"
        title="Deneyimler"
        description="Fotoğraflı üye uygulamalarını hak, kalite, konsept bağlantısı ve indeksleme açısından değerlendirin."
      />
      <WorkflowHint
        steps={[
          'Görselleri ve içerik bağlamını inceleyin.',
          'Konsept bağlantısı ile hak uygunluğunu kontrol edin.',
          'Uygunsa onaylayın; riskli içeriği gerekçeli süreçle reddedin.',
        ]}
      />
      <div className="mt-5">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <RecordCollection
        count={queue.data.length}
        label="Deneyim kayıtları"
        placeholder="Başlık, üye, şehir, konsept veya durum ara…"
      >
        {queue.data.length ? (
          queue.data.map((item) => (
            <Card
              key={item.id}
              className="p-5"
              data-admin-record
              data-search={`${item.title} ${item.body} ${item.author.profile?.displayName ?? ''} ${item.author.email ?? ''} ${item.city ?? ''} ${item.concept?.title ?? ''} ${item.status}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-800">Deneyim</Badge>
                <Badge>{item.status}</Badge>
                <Badge className="bg-stone-100 text-stone-700">{item.indexability}</Badge>
                {item.featured && <Badge className="bg-amber-50 text-amber-800">Öne çıkan</Badge>}
              </div>
              <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {item.author.profile?.displayName ?? 'Üye'} · {item.city ?? 'Şehir yok'} ·{' '}
                {item.concept?.title ?? 'Konsept bağlantısı yok'} ·{' '}
                {new Date(item.createdAt).toLocaleDateString('tr-TR')}
              </p>
              {item.summary && <p className="mt-2 text-sm leading-6">{item.summary}</p>}
              <RecordDetail
                facts={[
                  ['Üye', <AuthorIdentity key="a" author={item.author} />],
                  ['Etkinlik türü', item.eventType?.name],
                  ['Konsept', item.concept?.title],
                  [
                    'Etkinlik tarihi',
                    item.eventDate ? new Date(item.eventDate).toLocaleDateString('tr-TR') : null,
                  ],
                  ['Şehir / ilçe', [item.city, item.district].filter(Boolean).join(' / ')],
                  ['Mekân', item.venueType],
                  ['Misafir sayısı', item.guestCount],
                  ['Yaş etiketi', item.ageLabel],
                  ['Bütçe', item.budgetLabel],
                  ['Tema varyasyonu', item.themeVariation],
                  ['Renkler', item.colors.length ? item.colors.join(', ') : null],
                  [
                    'Etkileşim',
                    `${item.reactionCount} beğeni · ${item.saveCount} kaydetme · ${item.commentCount} yorum · ${item.viewCount} görüntülenme`,
                  ],
                  ['Gönderim', formatDateTime(item.createdAt)],
                  ['Son güncelleme', formatDateTime(item.updatedAt)],
                  [
                    'Herkese açık adres',
                    item.status === 'APPROVED' ? (
                      <a
                        key="u"
                        href={`${publicUrl}/tr/deneyim/${item.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[var(--accent-strong)]"
                      >
                        /tr/deneyim/{item.slug} ↗
                      </a>
                    ) : (
                      `/tr/deneyim/${item.slug} (henüz yayında değil)`
                    ),
                  ],
                ]}
                sections={[
                  ['Deneyim metni', item.body],
                  ['En iyi çalışan şey', item.whatWorked],
                  ['Bir dahaki sefere', item.whatWouldChange],
                  ['İpucu', item.tips],
                ]}
              >
                {item.images.length > 0 && (
                  <div className="admin-detail-images">
                    {item.images.map((image) => (
                      <figure key={image.id}>
                        <a href={resolveImageUrl(image.url)} target="_blank" rel="noreferrer">
                          <img src={resolveImageUrl(image.url)} alt={image.altText} />
                        </a>
                        <figcaption>{image.altText || 'Alt metin yok'}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </RecordDetail>
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {item.images.map((image) => (
                  <div key={image.id} className="relative min-w-32">
                    <img
                      src={resolveImageUrl(image.url)}
                      alt={image.altText}
                      className="aspect-square w-32 rounded-xl object-cover"
                    />
                    {item.images.length > 1 && (
                      <form action={updateExperience}>
                        <input type="hidden" name="id" value={item.id} />
                        <ConfirmButton
                          name="operation"
                          value={`remove:${image.id}`}
                          className="image-remove"
                          confirmMessage="Bu görseli deneyimden kaldırmak istediğinizden emin misiniz?"
                        >
                          Kaldır
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                ))}
              </div>
              <form action={updateExperience} className="mt-5 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={item.id} />
                <button
                  name="operation"
                  value="approve"
                  className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Onayla
                </button>
                <ConfirmButton
                  name="operation"
                  value="reject"
                  className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                  confirmMessage={`“${item.title}” deneyimini reddetmek istediğinizden emin misiniz?`}
                >
                  Reddet
                </ConfirmButton>
                <button
                  name="operation"
                  value="feature"
                  className="rounded-full border px-4 py-2 text-sm font-semibold"
                >
                  Öne çıkar
                </button>
                <button
                  name="operation"
                  value="noindex"
                  className="rounded-full border px-4 py-2 text-sm font-semibold"
                >
                  Noindex
                </button>
              </form>
            </Card>
          ))
        ) : (
          <EmptyState title="Deneyim kuyruğu boş" description="İncelenecek deneyim bulunmuyor." />
        )}
      </RecordCollection>
    </>
  );
}
