import { Badge, Card, EmptyState } from '@ilham/ui';
import { Flash } from '@/components/flash';
import { runAdminAction, type FlashParams } from '@/lib/actions';
import { AuthorIdentity } from '@/components/record-detail';
import { adminApi } from '@/lib/api';
import { formString } from '@/lib/form';
import { ConfirmButton, PageHeader, RecordCollection, WorkflowHint } from '@/components/admin-ui';

type CommentQueue = {
  data: Array<{
    id: string;
    body: string;
    entityType: string;
    depth: number;
    visibility: string;
    moderationStatus: string;
    createdAt: string;
    author: {
      email?: string;
      status?: string;
      profile: { displayName: string; username?: string | null; kind?: string } | null;
    };
    content: { title: string; href: string } | null;
  }>;
  meta: { total: number };
};

const publicUrl = process.env.WEB_URL ?? 'http://localhost:3000';

async function updateComment(formData: FormData) {
  'use server';
  await runAdminAction('/yorumlar', async () => {
    const id = formString(formData, 'id');
    const operation = formString(formData, 'operation');
    const payload =
      operation === 'hide'
        ? { visibility: 'HIDDEN' }
        : operation === 'remove'
          ? { visibility: 'REMOVED' }
          : { visibility: 'PUBLIC', moderationStatus: 'APPROVED' };
    await adminApi(`/community/admin/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
}

export default async function CommentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  const { mesaj, hata } = await searchParams;
  const queue = await adminApi<CommentQueue>('/community/admin/comments?pageSize=50');
  return (
    <>
      <PageHeader
        eyebrow="İnceleme merkezi · Etkileşim"
        title="Yorumlar"
        description="Konsept, deneyim ve tartışma altındaki yorumları bağlamıyla inceleyin; görünürlük kararlarını geri alınabilir biçimde yönetin."
      />
      <WorkflowHint
        steps={[
          'Yorumu bağlı olduğu içerikle birlikte okuyun.',
          'Topluluk kurallarıyla çelişen içeriği gizleyin veya kaldırın.',
          'Yanlış kararı geri getir seçeneğiyle düzeltin.',
        ]}
      />
      <div className="mt-5">
        <Flash mesaj={mesaj} hata={hata} />
      </div>
      <RecordCollection
        count={queue.data.length}
        label="Yorum kayıtları"
        placeholder="Yorum, üye, içerik veya durum ara…"
      >
        {queue.data.length ? (
          queue.data.map((item) => (
            <Card
              key={item.id}
              className="p-5"
              data-admin-record
              data-search={`${item.body} ${item.author.profile?.displayName ?? ''} ${item.content?.title ?? ''} ${item.visibility}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-stone-100 text-stone-700">Yorum</Badge>
                <Badge>{item.entityType}</Badge>
                <Badge className="bg-stone-100 text-stone-700">{item.visibility}</Badge>
                {item.depth > 0 && <Badge className="bg-stone-100 text-stone-700">Yanıt</Badge>}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6">{item.body}</p>
              <p className="mt-3 text-xs text-[var(--muted)]">
                <AuthorIdentity author={item.author} /> ·{' '}
                {new Date(item.createdAt).toLocaleString('tr-TR')}
                {item.content ? (
                  <>
                    {' · '}
                    <a
                      href={`${publicUrl}${item.content.href}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {item.content.title}
                    </a>
                  </>
                ) : null}
              </p>
              <form action={updateComment} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={item.id} />
                {item.visibility === 'PUBLIC' ? (
                  <>
                    <ConfirmButton
                      name="operation"
                      value="hide"
                      className="rounded-full border px-4 py-2 text-sm font-semibold"
                      confirmMessage="Bu yorumu gizlemek istediğinizden emin misiniz?"
                    >
                      Gizle
                    </ConfirmButton>
                    <ConfirmButton
                      name="operation"
                      value="remove"
                      className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                      confirmMessage="Bu yorumu kaldırmak istediğinizden emin misiniz?"
                    >
                      Kaldır
                    </ConfirmButton>
                  </>
                ) : (
                  <button
                    name="operation"
                    value="restore"
                    className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Geri getir
                  </button>
                )}
              </form>
            </Card>
          ))
        ) : (
          <EmptyState title="Yorum yok" description="Henüz yorum bulunmuyor." />
        )}
      </RecordCollection>
    </>
  );
}
