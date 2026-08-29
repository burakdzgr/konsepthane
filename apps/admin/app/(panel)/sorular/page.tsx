import { Badge, Card, EmptyState } from '@ilham/ui';
import { Flash } from '@/components/flash';
import { runAdminAction, type FlashParams } from '@/lib/actions';
import {
  AuthorIdentity,
  RecordDetail,
  formatDateTime,
  resolveImageUrl,
} from '@/components/record-detail';
import { adminApi } from '@/lib/api';
import { formString } from '@/lib/form';
import { ConfirmButton, PageHeader, RecordCollection, WorkflowHint } from '@/components/admin-ui';

type QuestionQueue = {
  data: Array<{
    id: string;
    title: string;
    slug: string;
    body: string;
    status: string;
    visibility: string;
    moderationStatus: string;
    indexability: string;
    featured: boolean;
    answerCount: number;
    createdAt: string;
    author: {
      email?: string;
      status?: string;
      profile: { displayName: string; username?: string | null; kind?: string } | null;
    };
    concept: { title: string; slug: string } | null;
    images: Array<{ id: string; url: string; altText: string }>;
    answers?: Array<{
      id: string;
      body: string;
      visibility: string;
      moderationStatus: string;
      createdAt: string;
      author: { email?: string; profile: { displayName: string; username?: string | null } | null };
    }>;
  }>;
  meta: { total: number };
};

const publicUrl = process.env.WEB_URL ?? 'http://localhost:3000';

async function updateQuestion(formData: FormData) {
  'use server';
  await runAdminAction('/sorular', async () => {
    const id = formString(formData, 'id');
    const operation = formString(formData, 'operation');
    const payload =
      operation === 'approve'
        ? { moderationStatus: 'APPROVED', visibility: 'PUBLIC' }
        : operation === 'hide'
          ? { visibility: 'HIDDEN' }
          : operation === 'remove'
            ? { visibility: 'REMOVED' }
            : operation === 'feature'
              ? { featured: true }
              : operation === 'unfeature'
                ? { featured: false }
                : operation === 'index'
                  ? { indexability: 'INDEX' }
                  : operation === 'noindex'
                    ? { indexability: 'NOINDEX' }
                    : operation === 'close'
                      ? { status: 'CLOSED' }
                      : { status: 'OPEN' };
    await adminApi(`/community/admin/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
}

export default async function QuestionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  const { mesaj, hata } = await searchParams;
  const queue = await adminApi<QuestionQueue>('/community/admin/questions?pageSize=50');
  return (
    <>
      <PageHeader
        eyebrow="İnceleme merkezi · Topluluk"
        title="Sorular"
        description="Topluluk sorularının yayın, görünürlük, indeksleme ve öne çıkarma durumunu tek yerden yönetin."
      />
      <WorkflowHint
        steps={[
          'Sorunun açık, özgün ve yanıtlanabilir olduğunu kontrol edin.',
          'Konsept bağlantısı ve topluluk güvenliğini doğrulayın.',
          'Yayın görünürlüğü ile indeksleme kararını birlikte verin.',
        ]}
      />
      <div className="mt-5">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <RecordCollection
        count={queue.data.length}
        label="Topluluk soruları"
        placeholder="Başlık, üye, konsept veya durum ara…"
      >
        {queue.data.length ? (
          queue.data.map((item) => (
            <Card
              key={item.id}
              className="p-5"
              data-admin-record
              data-search={`${item.title} ${item.author.profile?.displayName ?? ''} ${item.concept?.title ?? ''} ${item.visibility} ${item.moderationStatus}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sky-50 text-sky-800">Soru</Badge>
                <Badge>{item.moderationStatus}</Badge>
                <Badge className="bg-stone-100 text-stone-700">{item.visibility}</Badge>
                <Badge className="bg-stone-100 text-stone-700">{item.indexability}</Badge>
                <Badge className="bg-stone-100 text-stone-700">{item.status}</Badge>
                {item.featured && <Badge className="bg-amber-50 text-amber-800">Öne çıkan</Badge>}
              </div>
              <h2 className="mt-4 text-xl font-semibold">
                <a
                  href={`${publicUrl}/tr/soru/${item.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {item.title} ↗
                </a>
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{item.body}</p>
              <RecordDetail
                facts={[
                  ['Üye', <AuthorIdentity key="a" author={item.author} />],
                  ['Konsept', item.concept?.title],
                  [
                    'Durum',
                    `${item.status} · ${item.moderationStatus} · ${item.visibility} · ${item.indexability}`,
                  ],
                  ['Yanıt', `${item.answerCount} yanıt`],
                  ['Gönderim', formatDateTime(item.createdAt)],
                  ['Adres', `/tr/soru/${item.slug}`],
                ]}
                sections={[['Soru metni', item.body]]}
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
                <section className="admin-detail-section">
                  <h3>Yanıtlar ({item.answers?.length ?? 0})</h3>
                  {item.answers?.length ? (
                    <ul className="admin-answer-list">
                      {item.answers.map((answer) => (
                        <li key={answer.id}>
                          <strong>{answer.author.profile?.displayName ?? 'Üye'}</strong>{' '}
                          <small>
                            {answer.author.email ? `${answer.author.email} · ` : ''}
                            {formatDateTime(answer.createdAt)} · {answer.moderationStatus} ·{' '}
                            {answer.visibility}
                          </small>
                          <p>{answer.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Henüz yanıt yok.</p>
                  )}
                </section>
              </RecordDetail>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {item.author.profile?.displayName ?? 'Üye'} · {item.answerCount} yanıt ·{' '}
                {item.concept ? `Konsept: ${item.concept.title}` : 'Bağımsız soru'} ·{' '}
                {new Date(item.createdAt).toLocaleDateString('tr-TR')}
              </p>
              {item.images.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {item.images.map((image) => (
                    <img
                      key={image.id}
                      src={resolveImageUrl(image.url)}
                      alt={image.altText}
                      className="aspect-square w-20 rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
              <form action={updateQuestion} className="mt-5 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={item.id} />
                {(
                  [
                    ['approve', 'Onayla / yayına al', 'bg-emerald-700 text-white'],
                    ['hide', 'Gizle', 'border'],
                    ['remove', 'Kaldır', 'bg-red-700 text-white'],
                    [
                      item.featured ? 'unfeature' : 'feature',
                      item.featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar',
                      'border',
                    ],
                    [
                      item.indexability === 'INDEX' ? 'noindex' : 'index',
                      item.indexability === 'INDEX' ? 'Noindex' : 'İndeksle',
                      'border',
                    ],
                    [
                      item.status === 'CLOSED' ? 'open' : 'close',
                      item.status === 'CLOSED' ? 'Yeniden aç' : 'Kapat',
                      'border',
                    ],
                  ] satisfies Array<[string, string, string]>
                ).map(([value, label, className]) =>
                  ['hide', 'remove'].includes(value) ? (
                    <ConfirmButton
                      key={value}
                      name="operation"
                      value={value}
                      className={className}
                      confirmMessage={`“${item.title}” sorusu için “${label}” işlemini uygulamak istediğinizden emin misiniz?`}
                    >
                      {label}
                    </ConfirmButton>
                  ) : (
                    <button
                      key={value}
                      name="operation"
                      value={value}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${className}`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </form>
            </Card>
          ))
        ) : (
          <EmptyState title="Soru yok" description="Henüz topluluk sorusu bulunmuyor." />
        )}
      </RecordCollection>
    </>
  );
}
