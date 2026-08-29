import Link from 'next/link';
import { Badge, Card, EmptyState } from '@ilham/ui';
import { Flash } from '@/components/flash';
import { runAdminAction, type FlashParams } from '@/lib/actions';
import { adminApi } from '@/lib/api';
import { formString } from '@/lib/form';
import { ConfirmButton, PageHeader, RecordCollection, WorkflowHint } from '@/components/admin-ui';

type Queue = {
  data: Array<{
    id: string;
    contentType: string;
    contentId: string;
    status: string;
    priority: number;
    summary: string | null;
    createdAt: string;
    resolvedAt: string | null;
    content: { title: string; href: string; imageUrl: string | null; meta: string | null } | null;
    report: {
      reason: string;
      details: string | null;
      reporter: { profile: { displayName: string } | null };
    } | null;
    actions: Array<{ id: string; action: string; reason: string | null; createdAt: string }>;
  }>;
  meta: { total: number };
};

const publicUrl = process.env.WEB_URL ?? 'http://localhost:3000';

const actionLabels: Array<[string, string, string]> = [
  ['APPROVE', 'Onayla', 'bg-emerald-700 text-white'],
  ['HIDE', 'Gizle', 'border'],
  ['REMOVE', 'Kaldır', 'bg-red-700 text-white'],
  ['RESTORE', 'Geri getir', 'border'],
  ['WARN', 'Uyar', 'border'],
  ['REJECT', 'Reddet', 'border'],
];

async function moderate(formData: FormData) {
  'use server';
  await runAdminAction('/moderasyon', async () => {
    const id = formString(formData, 'id');
    const action = formString(formData, 'action');
    const reason = formString(formData, 'reason');
    if (['HIDE', 'REMOVE', 'WARN', 'REJECT'].includes(action) && reason.trim().length < 10)
      throw new Error('Bu işlem için en az 10 karakterlik bir gerekçe yazın.');
    await adminApi(`/community/admin/moderation/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action, reason: reason || undefined }),
    });
  });
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { durum?: string }>;
}) {
  const { durum = 'OPEN', mesaj, hata } = await searchParams;
  const filter = durum === 'ALL' ? '' : `&status=${durum}`;
  const queue = await adminApi<Queue>(`/community/admin/moderation?pageSize=50${filter}`);
  return (
    <>
      <PageHeader
        eyebrow="İnceleme merkezi · Güven ve güvenlik"
        title="Moderasyon kuyruğu"
        description="Raporları öncelik ve bağlamla değerlendirin. Görünürlük azaltan her işlem gerekçe ister ve tüm yönetim eylemleri denetim izine yazılır."
      />
      <WorkflowHint
        steps={[
          'Raporu ve ilgili içeriği birlikte okuyun.',
          'Geçmiş eylemleri kontrol edip ölçülü kararı seçin.',
          'Kısıtlayıcı işlemlerde açık gerekçe yazın ve sonucu doğrulayın.',
        ]}
      />
      <div className="mt-5">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
        {[
          ['OPEN', 'Açık'],
          ['IN_REVIEW', 'İncelemede'],
          ['RESOLVED', 'Çözüldü'],
          ['ALL', 'Tümü'],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={`/moderasyon?durum=${key}`}
            className={`rounded-full border px-4 py-2 ${durum === key ? 'bg-[var(--ink)] text-white' : 'bg-white'}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <RecordCollection
        count={queue.data.length}
        label="İnceleme kayıtları"
        placeholder="Başlık, rapor nedeni veya içerik türü ara…"
      >
        {queue.data.length ? (
          queue.data.map((item) => (
            <Card
              key={item.id}
              className="p-5"
              data-admin-record
              data-search={`${item.content?.title ?? ''} ${item.contentType} ${item.report?.reason ?? ''} ${item.status}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{item.contentType}</Badge>
                <Badge className="bg-stone-100 text-stone-700">{item.status}</Badge>
                {item.priority >= 10 && (
                  <Badge className="bg-red-100 text-red-800">Yüksek öncelik</Badge>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[96px_1fr]">
                {item.content?.imageUrl ? (
                  <img
                    src={item.content.imageUrl}
                    alt=""
                    className="aspect-square w-24 rounded-xl object-cover"
                  />
                ) : (
                  <div className="aspect-square w-24 rounded-xl bg-stone-100" />
                )}
                <div>
                  <h2 className="font-semibold">
                    {item.content ? (
                      <a
                        href={`${publicUrl}${item.content.href}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {item.content.title} ↗
                      </a>
                    ) : (
                      'İçerik artık herkese açık değil'
                    )}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--accent)]">
                    {item.report?.reason ?? 'İnceleme'}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {item.summary ?? item.report?.details ?? 'Açıklama yok.'}
                  </p>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Bildiren: {item.report?.reporter.profile?.displayName ?? 'Üye'} ·{' '}
                    {new Date(item.createdAt).toLocaleString('tr-TR')}
                  </p>
                  {item.actions.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                      {item.actions.map((entry) => (
                        <li key={entry.id}>
                          {entry.action} · {new Date(entry.createdAt).toLocaleString('tr-TR')}
                          {entry.reason ? ` · ${entry.reason}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {item.status !== 'RESOLVED' && (
                <form action={moderate} className="mt-5 grid gap-3">
                  <input type="hidden" name="id" value={item.id} />
                  <label>
                    Gerekçe (isteğe bağlı)
                    <input
                      name="reason"
                      maxLength={1000}
                      className="min-h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {actionLabels.map(([value, label, className]) =>
                      ['HIDE', 'REMOVE', 'WARN', 'REJECT'].includes(value) ? (
                        <ConfirmButton
                          key={value}
                          name="action"
                          value={value}
                          className={className}
                          confirmMessage={`${label} işlemini uygulamak istediğinizden emin misiniz? Yazdığınız gerekçe denetim kaydına bağlanacaktır.`}
                        >
                          {label}
                        </ConfirmButton>
                      ) : (
                        <button
                          key={value}
                          name="action"
                          value={value}
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${className}`}
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                </form>
              )}
            </Card>
          ))
        ) : (
          <EmptyState title="Kuyruk temiz" description="Şu anda incelenecek rapor veya vaka yok." />
        )}
      </RecordCollection>
    </>
  );
}
