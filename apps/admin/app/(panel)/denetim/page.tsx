import { Badge, Card, EmptyState } from '@ilham/ui';
import { PageHeader, RecordCollection, WorkflowHint } from '@/components/admin-ui';
import { adminApi } from '@/lib/api';

type AuditResult = {
  data: Array<{
    id: string;
    actorId: string | null;
    actor: { email: string; profile: { displayName: string } | null } | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    requestId: string | null;
    metadata: { method?: string; path?: string } | null;
    createdAt: string;
  }>;
  meta: { total: number };
};

export default async function AuditPage() {
  const result = await adminApi<AuditResult>('/audit?pageSize=100');
  return (
    <>
      <PageHeader
        eyebrow="Ekip ve erişim · Güvenlik"
        title="Denetim izi"
        description="Kimlik doğrulanmış yönetim değişikliklerinin aktör, hedef, istek ve zaman bilgisini inceleyin. Hassas form içerikleri ve parolalar bu kayıtlara alınmaz."
      />
      <WorkflowHint
        title="Güvenlik incelemesi"
        steps={[
          'Beklenmeyen işlem veya saatleri arayın.',
          'İstek kimliğini sunucu loglarıyla eşleştirin.',
          'Şüpheli durumda hesabı askıya alıp oturumları iptal edin.',
        ]}
      />
      <RecordCollection
        count={result.data.length}
        label={`Son işlemler · toplam ${result.meta.total}`}
        placeholder="İşlem, hedef veya istek kimliği ara…"
      >
        {result.data.map((entry) => (
          <Card
            key={entry.id}
            className="p-5"
            data-admin-record
            data-search={`${entry.action} ${entry.entityType ?? ''} ${entry.entityId ?? ''} ${entry.actor?.email ?? ''} ${entry.actor?.profile?.displayName ?? ''} ${entry.requestId ?? ''}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{entry.metadata?.method ?? entry.action.split(' ')[0]}</Badge>
              <strong className="text-sm">{entry.entityType ?? 'oturum'}</strong>
              <time className="ml-auto text-xs text-[var(--muted)]">
                {new Date(entry.createdAt).toLocaleString('tr-TR')}
              </time>
            </div>
            <p className="mt-3 break-all font-mono text-xs text-[var(--ink-2)]">{entry.action}</p>
            <dl className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-3">
              <div>
                <dt>Aktör</dt>
                <dd className="break-all text-[var(--ink)]">
                  {entry.actor?.profile?.displayName ??
                    entry.actor?.email ??
                    entry.actorId ??
                    'Sistem'}
                </dd>
              </div>
              <div>
                <dt>Hedef</dt>
                <dd className="break-all text-[var(--ink)]">{entry.entityId ?? '—'}</dd>
              </div>
              <div>
                <dt>İstek kimliği</dt>
                <dd className="break-all text-[var(--ink)]">{entry.requestId ?? '—'}</dd>
              </div>
            </dl>
          </Card>
        ))}
        {!result.data.length && (
          <EmptyState
            title="Denetim kaydı yok"
            description="Henüz kaydedilmiş bir yönetim işlemi bulunmuyor."
          />
        )}
      </RecordCollection>
    </>
  );
}
