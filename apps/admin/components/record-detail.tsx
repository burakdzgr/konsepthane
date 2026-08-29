import type { ReactNode } from 'react';

const publicUrl = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Member uploads are absolute bucket URLs; seeded placeholders are web-relative (`/placeholders/…`). */
export function resolveImageUrl(url: string) {
  return url.startsWith('/') ? `${publicUrl}${url}` : url;
}

/** Collapsible "full content" block for moderation cards: facts grid + long-text sections. */
export function RecordDetail({
  title = 'İçeriğin tamamını göster',
  facts,
  sections,
  children,
}: {
  title?: string;
  facts?: Array<[label: string, value: ReactNode]>;
  sections?: Array<[label: string, value: string | null | undefined]>;
  children?: ReactNode;
}) {
  const visibleFacts = (facts ?? []).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  );
  const visibleSections = (sections ?? []).filter(([, value]) => value && value.trim());
  return (
    <details className="admin-detail">
      <summary>{title}</summary>
      <div className="admin-detail-body">
        {visibleFacts.length > 0 && (
          <dl className="admin-detail-facts">
            {visibleFacts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {visibleSections.map(([label, value]) => (
          <section key={label} className="admin-detail-section">
            <h3>{label}</h3>
            <p>{value}</p>
          </section>
        ))}
        {children}
      </div>
    </details>
  );
}

export function AuthorIdentity({
  author,
}: {
  author: {
    email?: string;
    status?: string;
    profile: { displayName: string; username?: string | null; kind?: string } | null;
  };
}) {
  return (
    <span>
      {author.profile?.displayName ?? 'Üye'}
      {author.profile?.username ? ` (@${author.profile.username})` : ''}
      {author.email ? ` · ${author.email}` : ''}
      {author.profile?.kind === 'EDITOR' ? ' · editör hesabı' : ''}
      {author.status && author.status !== 'ACTIVE' ? ` · hesap: ${author.status}` : ''}
    </span>
  );
}

export const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
