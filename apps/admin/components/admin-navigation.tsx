'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminNavSection = {
  title: string;
  items: Array<{ label: string; href: string; description: string }>;
};

export function AdminNavigation({ sections }: { sections: AdminNavSection[] }) {
  const currentPath = usePathname().replace(/^\/admin(?=\/|$)/, '') || '/';

  return (
    <nav className="admin-navigation" aria-label="Yönetim bölümleri">
      {sections.map((section) => (
        <div className="admin-nav-section" key={section.title}>
          <p>{section.title}</p>
          {section.items.map((item) => {
            const active =
              item.href === '/'
                ? currentPath === '/'
                : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'is-active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
