'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  /** Kept for call-site compatibility; page-level prose is no longer rendered. */
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

export function WorkflowHint({
  title = 'Bu ekranın akışı',
  steps,
}: {
  title?: string;
  steps: string[];
}) {
  return (
    <aside className="workflow-hint" aria-label={title}>
      <ol>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </aside>
  );
}

export function CreatePanel({
  title,
  description,
  children,
  open = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="admin-create-panel" open={open}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="admin-summary-action">Formu aç</span>
      </summary>
      <div className="admin-create-body">{children}</div>
    </details>
  );
}

export function RecordCollection({
  children,
  count,
  label,
  placeholder = 'Kayıtlarda ara…',
}: {
  children: ReactNode;
  count: number;
  label: string;
  placeholder?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(count);

  useEffect(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    const records = Array.from(
      root.current?.querySelectorAll<HTMLElement>('[data-admin-record]') ?? [],
    );
    let visible = 0;
    for (const record of records) {
      const haystack = (record.dataset.search ?? record.textContent ?? '').toLocaleLowerCase(
        'tr-TR',
      );
      const matches = !normalized || haystack.includes(normalized);
      record.hidden = !matches;
      if (matches) visible += 1;
    }
    setVisibleCount(visible);
  }, [query, children]);

  return (
    <section className="admin-record-section" ref={root}>
      <div className="admin-record-toolbar">
        <div>
          <strong>{label}</strong>
          <span>{query ? `${visibleCount} eşleşme` : `${count} kayıt`}</span>
        </div>
        <label>
          <span className="sr-only">{placeholder}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
        </label>
      </div>
      <div className="admin-record-list">{children}</div>
      {count > 0 && visibleCount === 0 && (
        <p className="admin-empty-filter">Bu aramayla eşleşen kayıt yok.</p>
      )}
    </section>
  );
}

export function SubmitButton({
  children,
  pendingText = 'Kaydediliyor…',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type={props.type ?? 'submit'}
      className={`admin-submit ${className}`.trim()}
      disabled={pending || props.disabled}
      aria-disabled={pending || props.disabled}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function ConfirmButton({
  confirmMessage,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { confirmMessage: string }) {
  return (
    <button
      {...props}
      type={props.type ?? 'submit'}
      className={`admin-danger ${className}`.trim()}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
        props.onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
