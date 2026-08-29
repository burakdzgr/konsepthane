import Link from 'next/link';
import { Card } from '@ilham/ui';
import { PageHeader, WorkflowHint } from '@/components/admin-ui';
import { adminApi, getAdminActor } from '@/lib/api';

type Overview = {
  pending: number;
  reports: number;
  members: number;
  content: number;
  experiences: number;
};

type PageMeta = { meta: { total: number } };

async function optional<T>(allowed: boolean, request: () => Promise<T>): Promise<T | null> {
  if (!allowed) return null;
  try {
    return await request();
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const actor = await getAdminActor();
  const can = (permission: string) => actor.permissions.includes(permission);
  const [overview, concepts, guides, users] = await Promise.all([
    optional<Overview>(can('moderation.manage'), () => adminApi('/community/admin/overview')),
    optional<PageMeta>(can('concept.read'), () => adminApi('/concepts/admin/all?pageSize=1')),
    optional<PageMeta>(can('concept.read'), () => adminApi('/guides/admin/all?pageSize=1')),
    optional<PageMeta>(can('user.read'), () => adminApi('/users?pageSize=1')),
  ]);

  const quickActions = [
    can('concept.write') && {
      title: 'Yeni konsept oluştur',
      description: 'Başlık, kategori ve özetle taslak başlatın.',
      href: '/konseptler?yeni=1',
      tone: 'primary',
    },
    can('concept.write') && {
      title: 'Yeni rehber oluştur',
      description: 'Uygulanabilir uzun içerik hazırlayın.',
      href: '/rehberler?yeni=1',
      tone: 'neutral',
    },
    can('moderation.manage') && {
      title: 'İnceleme kuyruğuna git',
      description: `${overview?.pending ?? 0} vaka işlem bekliyor.`,
      href: '/moderasyon',
      tone: 'warning',
    },
    can('user.write') && {
      title: 'Ekip erişimi yönet',
      description: 'Kullanıcı, rol ve oturumları kontrol edin.',
      href: '/kullanicilar',
      tone: 'neutral',
    },
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    href: string;
    tone: string;
  }>;

  const metrics = [
    concepts && { label: 'Konsept', value: concepts.meta.total, href: '/konseptler' },
    guides && { label: 'Rehber', value: guides.meta.total, href: '/rehberler' },
    overview && { label: 'Bekleyen vaka', value: overview.pending, href: '/moderasyon' },
    overview && { label: 'Açık rapor', value: overview.reports, href: '/moderasyon' },
    users && { label: 'Kullanıcı', value: users.meta.total, href: '/kullanicilar' },
  ].filter(Boolean) as Array<{ label: string; value: number; href: string }>;

  return (
    <>
      <PageHeader
        eyebrow="Kontrol merkezi"
        title="Bugün neyi yönetmeniz gerekiyor?"
        description="Panel yalnızca yetkiniz olan işleri gösterir. Önce bekleyenleri tamamlayın, sonra yeni içerik üretin."
      />

      <WorkflowHint
        steps={[
          'Bekleyen moderasyon ve inceleme kayıtlarını kontrol edin.',
          'İçeriği taslak olarak oluşturun; önizlemesini doğrulayın.',
          'Yalnızca hazır içerikleri yayına ve indekslemeye açın.',
        ]}
      />

      <section className="admin-dashboard-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Hızlı işlemler</p>
            <h2>En sık kullanılan başlangıçlar</h2>
          </div>
        </div>
        <div className="admin-action-grid">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`admin-action-card ${action.tone}`}
            >
              <span>→</span>
              <strong>{action.title}</strong>
              <p>{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-dashboard-grid">
        <Card className="admin-status-card">
          <div className="admin-section-heading compact">
            <div>
              <p className="admin-eyebrow">Canlı durum</p>
              <h2>İçerik envanteri</h2>
            </div>
          </div>
          <div className="admin-metric-grid">
            {metrics.map((metric) => (
              <Link href={metric.href} key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="admin-security-card">
          <p className="admin-eyebrow">Güvenlik</p>
          <h2>Koruma katmanları etkin</h2>
          <ul>
            <li>Yetkiler her API isteğinde veritabanından doğrulanır.</li>
            <li>Yönetim değişiklikleri gövde içeriği olmadan denetim izine yazılır.</li>
            <li>Oturum yenileme anahtarları tek kullanımlıdır ve güvenli çıkışta iptal edilir.</li>
            <li>Giriş denemeleri hız sınırı ve sıkı tarayıcı politikalarıyla korunur.</li>
          </ul>
        </Card>
      </section>
    </>
  );
}
