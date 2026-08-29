import type { ReactNode } from 'react';
import Link from 'next/link';
import { Card, Icon, TopicChip } from '@ilham/ui';
import { getTopics } from '@/lib/community';
import { getDictionary, localePath, type Locale } from '@/lib/i18n';
import { topicHref } from '@/lib/topics';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="wrap py-10 sm:py-14">
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1>{title}</h1>
            <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">{description}</p>
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}

export async function DetailShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  const topics = await getTopics();
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  return (
    <div className="wrap grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">{children}</div>
      <aside className="space-y-4">
        <Card className="p-5 shadow-none">
          <h2 className="font-semibold">İlgili konuları keşfet</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {topics.slice(0, 8).map((topic) => (
              <TopicChip
                key={topic.id}
                label={topic.name}
                href={topicHref(locale, topic.name, topics)}
              />
            ))}
          </div>
        </Card>
        <Card className="p-5 shadow-none">
          <h2 className="font-semibold">Katkı verirken</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Kendi deneyimini belirt, kişisel bilgileri paylaşma ve kullandığın görsellerin haklarını
            doğrula.
          </p>
          <Link
            href={p('/topluluk-kurallari')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-strong)]"
          >
            {t.nav.footer.rules} <Icon name="arrow-right" size={15} />
          </Link>
        </Card>
      </aside>
    </div>
  );
}
