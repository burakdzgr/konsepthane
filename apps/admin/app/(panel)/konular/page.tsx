import { Badge, Card } from '@ilham/ui';
import { adminApi } from '@/lib/api';
import { PageHeader, WorkflowHint } from '@/components/admin-ui';
type Topic = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  featured: boolean;
  contentCount: number;
  followerCount: number;
};
export default async function TopicsAdminPage() {
  const topics = await adminApi<Topic[]>('/community/topics?pageSize=50');
  return (
    <>
      <PageHeader
        eyebrow="İçerik üretimi · Keşif grafiği"
        title="Konular"
        description="Etkinlik, tema, yaş, renk, bütçe ve format konularının içerik ile takipçi karşılığını izleyin."
      />
      <WorkflowHint
        title="Bu ekran ne için?"
        steps={[
          'Konuların içerik kapsamını karşılaştırın.',
          'Az içerikli ama talep gören konuları belirleyin.',
          'Öne çıkarma kararını editoryal planla birlikte verin.',
        ]}
      />
      <Card className="mt-7 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Konu</th>
              <th>Tür</th>
              <th>İçerik</th>
              <th>Takipçi</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.id}>
                <td>
                  <strong>{topic.name}</strong>
                  <span className="block text-xs text-[var(--muted)]">/{topic.slug}</span>
                </td>
                <td>{topic.kind}</td>
                <td>{topic.contentCount}</td>
                <td>{topic.followerCount}</td>
                <td>{topic.featured ? <Badge>Öne çıkan</Badge> : 'Standart'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
