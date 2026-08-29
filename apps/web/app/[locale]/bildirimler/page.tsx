import { EmptyState, NotificationItem } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { AuthRequired } from '@/components/auth-modal';
import { getMember, memberApi } from '@/lib/auth';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';

export const metadata = { title: 'Bildirimler', robots: 'noindex,nofollow' };
export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  const member = await getMember();
  if (!member) {
    const modal = getDictionary(locale).pages.authModal;
    return (
      <>
        <PageHeader
          eyebrow="Kişisel alan"
          title="Bildirimler"
          description="Yanıtlar, takipler ve moderasyon güncellemeleri burada görünür."
        />
        <AuthRequired
          next={localePath(locale, '/bildirimler')}
          title={modal.requiredTitle}
          text={modal.requiredText}
        />
      </>
    );
  }
  let items: Array<{ id: string; message: string; createdAt: string; readAt: string | null }> = [];
  try {
    items = await memberApi('/notifications');
  } catch {
    // API hiccup: show the empty state rather than an error page.
  }
  return (
    <>
      <PageHeader
        eyebrow="Kişisel alan"
        title="Bildirimler"
        description="Yanıtlar, takipler ve moderasyon güncellemeleri burada görünür."
      />
      <div className="mx-auto max-w-2xl space-y-2 px-5 py-8">
        {items.length ? (
          items.map((item) => (
            <NotificationItem
              key={item.id}
              message={item.message}
              time={new Date(item.createdAt).toLocaleString('tr-TR')}
              unread={!item.readAt}
            />
          ))
        ) : (
          <EmptyState
            title="Yeni bildirim yok"
            description="Giriş yaptıktan sonra topluluk etkileşimlerin burada görünür."
          />
        )}
      </div>
    </>
  );
}
