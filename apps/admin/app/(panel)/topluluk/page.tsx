import { Card } from '@ilham/ui';
import { adminApi } from '@/lib/api';
import { PageHeader, WorkflowHint } from '@/components/admin-ui';
export default async function CommunityAdminPage() {
  const overview = await adminApi<{
    pending: number;
    reports: number;
    members: number;
    content: number;
    experiences: number;
  }>('/community/admin/overview');
  return (
    <>
      <PageHeader
        eyebrow="İnceleme merkezi · Sağlık"
        title="Topluluk özeti"
        description="Üye katılımını, açık raporları ve bekleyen incelemeleri tek bakışta izleyin."
      />
      <WorkflowHint
        title="Günlük kontrol"
        steps={[
          'Bekleyen vaka ve açık rapor sayılarını karşılaştırın.',
          'Deneyim ve soru üretimindeki değişimi izleyin.',
          'Ani artışlarda moderasyon kuyruğunu önceliklendirin.',
        ]}
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-5">
        {[
          ['Aktif üye', overview.members],
          ['Soru', overview.content],
          ['Deneyim', overview.experiences],
          ['Açık rapor', overview.reports],
          ['Bekleyen vaka', overview.pending],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <strong className="text-3xl">{value}</strong>
            <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Ticari özellikler kapalı</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Pazaryeri, affiliate, reklam, lead üretimi ve sponsorlu içerik bayrakları kapalıdır. Ürün
          yüzeyi editoryal içerik merkezlidir; topluluk katmanı konseptleri ve rehberleri gerçek
          deneyimlerle zenginleştirir.
        </p>
      </Card>
    </>
  );
}
