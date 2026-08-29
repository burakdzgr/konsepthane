import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminNavigation, type AdminNavSection } from '@/components/admin-navigation';
import { getAdminActor, logout } from '@/lib/api';

async function logoutAction() {
  'use server';
  await logout();
  redirect('/giris');
}

type RestrictedNavItem = {
  label: string;
  href: string;
  description: string;
  permissions?: string[];
};

const navigation: Array<{ title: string; items: RestrictedNavItem[] }> = [
  {
    title: 'Başlangıç',
    items: [{ label: 'Kontrol merkezi', href: '/', description: 'Öncelikler ve hızlı işlemler' }],
  },
  {
    title: 'İçerik üretimi',
    items: [
      {
        label: 'Konseptler',
        href: '/konseptler',
        description: 'Ana editoryal içerikler',
        permissions: ['concept.read'],
      },
      {
        label: 'Rehberler',
        href: '/rehberler',
        description: 'Uygulanabilir uzun içerikler',
        permissions: ['concept.read'],
      },
      {
        label: 'Blog yazıları',
        href: '/blog',
        description: 'Markdown blog içerikleri',
        permissions: ['concept.read'],
      },
      {
        label: 'Blog kategorileri',
        href: '/blog/kategoriler',
        description: 'Blog sınıflandırması',
        permissions: ['concept.read'],
      },
      {
        label: 'Kategoriler',
        href: '/kategoriler',
        description: 'Site ana sınıflandırması',
        permissions: ['category.read'],
      },
      {
        label: 'Konular',
        href: '/konular',
        description: 'Etiket ve keşif grafiği',
        permissions: ['community.read'],
      },
    ],
  },
  {
    title: 'İnceleme merkezi',
    items: [
      {
        label: 'Moderasyon kuyruğu',
        href: '/moderasyon',
        description: 'Öncelikli rapor ve vakalar',
        permissions: ['moderation.manage'],
      },
      {
        label: 'Deneyimler',
        href: '/deneyimler',
        description: 'Fotoğraflı üye paylaşımları',
        permissions: ['moderation.manage'],
      },
      {
        label: 'Sorular',
        href: '/sorular',
        description: 'Yayın ve görünürlük kontrolü',
        permissions: ['moderation.manage'],
      },
      {
        label: 'Yorumlar',
        href: '/yorumlar',
        description: 'Yanıt ve yorum denetimi',
        permissions: ['moderation.manage'],
      },
      {
        label: 'Topluluk özeti',
        href: '/topluluk',
        description: 'Sağlık ve katılım görünümü',
        permissions: ['moderation.manage'],
      },
    ],
  },
  {
    title: 'Ekip ve erişim',
    items: [
      {
        label: 'Editörler',
        href: '/editorler',
        description: 'Yazar profilleri ve byline',
        permissions: ['user.read'],
      },
      {
        label: 'Kullanıcılar',
        href: '/kullanicilar',
        description: 'Hesap, rol ve erişim',
        permissions: ['user.read'],
      },
      {
        label: 'Denetim izi',
        href: '/denetim',
        description: 'Yönetim işlemleri ve aktörler',
        permissions: ['audit.read'],
      },
    ],
  },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  let actor;
  try {
    actor = await getAdminActor();
  } catch {
    redirect('/giris?hata=oturum');
  }

  const sections: AdminNavSection[] = navigation
    .map((section) => ({
      title: section.title,
      items: section.items
        .filter(
          (item) =>
            !item.permissions ||
            item.permissions.some((permission) => actor.permissions.includes(permission)),
        )
        .map(({ label, href, description }) => ({ label, href, description })),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand-row">
          <Link href="/" className="admin-brand" aria-label="Konsepthane">
            <img
              src="/admin/brand/konsepthane-logo.png?v=2"
              alt="Konsepthane"
              width="1901"
              height="509"
            />
          </Link>
          <span>Yönetim</span>
        </div>
        <div className="admin-desktop-navigation">
          <AdminNavigation sections={sections} />
        </div>
        <details className="admin-mobile-navigation">
          <summary>Yönetim menüsü</summary>
          <AdminNavigation sections={sections} />
        </details>
        <div className="admin-sidebar-footer">
          <span className="security-dot" aria-hidden="true" />
          <p>
            <strong>Güvenli oturum</strong>
            <small>Yetkiler her istekte yeniden doğrulanır.</small>
          </p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <strong>İçerik operasyonları</strong>
            <span>Canlı veriyi kontrollü biçimde yönetin</span>
          </div>
          <div className="admin-account">
            <span>{actor.email}</span>
            <form action={logoutAction}>
              <button type="submit">Güvenli çıkış</button>
            </form>
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
