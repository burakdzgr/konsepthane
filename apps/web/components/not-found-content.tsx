'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localeFromPath, localePath, type Locale } from '@/lib/locales';

export function NotFoundContent({
  labels,
}: {
  labels: Record<Locale, { title: string; text: string; home: string }>;
}) {
  const locale = localeFromPath(usePathname());
  const t = labels[locale];
  return (
    <div className="wrap reading py-24 text-center">
      <p className="section-eyebrow">404</p>
      <h1 className="mt-3 text-4xl">{t.title}</h1>
      <p className="mt-4 text-[var(--muted)]">{t.text}</p>
      <Link href={localePath(locale, '/')} className="btn btn-primary mt-8">
        {t.home}
      </Link>
    </div>
  );
}
