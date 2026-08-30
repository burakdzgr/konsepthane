'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { contentValidation } from './rich-text-validation';

const Editor = dynamic(() => import('./rich-text-editor'), {
  ssr: false,
  loading: () => <p role="status">Editör yükleniyor…</p>,
});

/** Markdown remains the storage contract. Untouched records are never silently reserialized. */
export function RichTextField({
  name,
  label,
  defaultValue,
  required = false,
  minLength = 0,
  maxLength = 60000,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null | undefined;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  hint?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const [value, setValue] = useState(defaultValue ?? '');
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState(false);
  const [error, setError] = useState('');

  const change = (next: string) => {
    // Immediate submission must read the latest transaction, not a previous React render.
    if (field.current) field.current.value = next;
    setValue(next);
    setError('');
  };
  useEffect(() => {
    change(defaultValue ?? '');
  }, [defaultValue]);
  useEffect(() => {
    const ancestors: HTMLDetailsElement[] = [];
    let parent = root.current?.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) ancestors.push(parent);
      parent = parent.parentElement;
    }
    const check = () => {
      if (ancestors.every((details) => details.open)) setReady(true);
    };
    check();
    ancestors.forEach((details) => details.addEventListener('toggle', check));
    return () => ancestors.forEach((details) => details.removeEventListener('toggle', check));
  }, []);
  useEffect(() => {
    const form = root.current?.closest('form');
    const submit = (event: Event) => {
      const message = busy.current
        ? 'Görsel yüklemesi bitmeden kaydedemezsiniz.'
        : contentValidation(field.current?.value ?? '', required, minLength, maxLength);
      if (!message) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setError(message);
      root.current?.scrollIntoView({ block: 'center' });
      if (source || !ready) field.current?.focus();
      else root.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
    };
    const reset = () => change(defaultValue ?? '');
    form?.addEventListener('submit', submit, true);
    form?.addEventListener('reset', reset);
    return () => {
      form?.removeEventListener('submit', submit, true);
      form?.removeEventListener('reset', reset);
    };
  }, [defaultValue, maxLength, minLength, ready, required, source]);

  return (
    <div className="rich-text-field" ref={root}>
      <div className="rich-text-heading">
        <span id={`${id}-label`}>
          {label}
          {required ? ' *' : ''}
        </span>
        {ready && (
          <button type="button" aria-pressed={source} onClick={() => setSource(!source)}>
            {source ? 'Görsel editöre dön' : 'Markdown kaynağı'}
          </button>
        )}
      </div>
      <textarea
        ref={field}
        name={name}
        aria-label={`${label} Markdown kaynağı`}
        aria-describedby={`${id}-hint`}
        className={ready && !source ? 'sr-only rich-text-storage' : 'rich-text-source'}
        tabIndex={ready && !source ? -1 : 0}
        value={value}
        onChange={(event) => change(event.target.value)}
        rows={12}
        spellCheck={false}
      />
      {ready && (
        <div hidden={source}>
          <Editor
            value={value}
            label={label}
            labelId={`${id}-label`}
            onChange={change}
            onBusy={(next) => {
              busy.current = next;
            }}
          />
        </div>
      )}
      <p id={`${id}-hint`} className="rich-text-hint">
        {hint ??
          'Başlık, liste, tablo, bağlantı ve görsel ekleyin. Kaydetmeden önce önizlemeyi kontrol edin.'}{' '}
        <span>
          {value.trim().length.toLocaleString('tr-TR')} / {maxLength.toLocaleString('tr-TR')}{' '}
          karakter{minLength ? ` · en az ${minLength}` : ''}
        </span>
      </p>
      {error && (
        <p role="alert" className="rich-text-error">
          {error}
        </p>
      )}
    </div>
  );
}
