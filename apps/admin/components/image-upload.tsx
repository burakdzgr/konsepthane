'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { safeContentUrl } from '@ilham/content';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 15_000_000;

type Uploaded = { url: string; key: string };

export async function uploadFile(file: File): Promise<Uploaded> {
  if (!ACCEPT.split(',').includes(file.type))
    throw new Error('Yalnızca JPEG, PNG, WebP veya AVIF görsel yüklenebilir.');
  if (file.size > MAX_BYTES) throw new Error('Görsel en fazla 15 MB olabilir.');
  if (!file.size) throw new Error('Boş dosya yüklenemez.');
  const body = new FormData();
  body.append('file', file, file.name);
  const response = await fetch('/admin/api/upload', { method: 'POST', body });
  const payload = (await response.json().catch(() => ({}))) as Partial<Uploaded> & {
    message?: string;
  };
  if (!response.ok || !payload.url) throw new Error(payload.message ?? 'Yükleme başarısız.');
  if (!safeContentUrl(payload.url, true))
    throw new Error('Sunucu geçersiz bir görsel adresi döndürdü.');
  return { url: payload.url, key: payload.key ?? '' };
}

function useDropzone(onFiles: (files: File[]) => void) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    setActive(true);
  };
  const onDragLeave = () => setActive(false);
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setActive(false);
    onFiles(Array.from(event.dataTransfer.files));
  };
  return { active, inputRef, onDragOver, onDragLeave, onDrop };
}

/**
 * Single image field: drag & drop / click to pick, preview, remove. Submits the stored URL in a
 * hidden input named `name`, so server actions keep reading a plain string.
 */
export function ImageUploadField({
  name,
  label,
  defaultValue,
  hint,
  aspect = '4 / 3',
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  aspect?: string;
  required?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handle = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file);
      setValue(uploaded.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Yükleme başarısız.');
    } finally {
      setBusy(false);
    }
  };
  const zone = useDropzone((files) => void handle(files));
  return (
    <div className="image-upload">
      <span className="image-upload-label" id={`${id}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <div
        role="button"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        aria-busy={busy}
        className={`image-dropzone ${zone.active ? 'is-active' : ''} ${value ? 'has-image' : ''}`}
        style={{ aspectRatio: aspect }}
        onClick={() => zone.inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            zone.inputRef.current?.click();
          }
        }}
        onDragOver={zone.onDragOver}
        onDragLeave={zone.onDragLeave}
        onDrop={zone.onDrop}
      >
        {value ? <img src={value} alt="" /> : null}
        <div className="image-dropzone-overlay">
          {busy ? (
            <span>Yükleniyor…</span>
          ) : value ? (
            <span>Değiştirmek için tıkla veya yeni görseli sürükle</span>
          ) : (
            <span>
              <strong>Görseli buraya sürükle</strong> veya tıklayıp seç
              <small>JPEG, PNG, WebP, AVIF · en fazla 15 MB</small>
            </span>
          )}
        </div>
        <input
          ref={zone.inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          required={required && !value}
          onChange={(event) => {
            void handle(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </div>
      <div className="image-upload-meta">
        {value ? (
          <>
            <a href={value} target="_blank" rel="noreferrer" className="image-upload-link">
              Görseli aç
            </a>
            <button type="button" className="image-upload-remove" onClick={() => setValue('')}>
              Kaldır
            </button>
          </>
        ) : null}
        {hint && !error ? <small>{hint}</small> : null}
        {error ? <small className="image-upload-error">{error}</small> : null}
      </div>
    </div>
  );
}

export type GalleryImage = { url: string; altText: string };

/**
 * Multi-image gallery: drop several files, edit alt text, reorder (up/down), remove. Submits a
 * JSON array in a hidden input named `name`.
 */
export function GalleryUploadField({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: GalleryImage[];
  hint?: string;
}) {
  const id = useId();
  const [items, setItems] = useState<GalleryImage[]>(defaultValue ?? []);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const handle = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (!images.length) return;
    setError(null);
    setBusy((count) => count + images.length);
    await Promise.all(
      images.map(async (file) => {
        try {
          const uploaded = await uploadFile(file);
          setItems((current) => [
            ...current,
            { url: uploaded.url, altText: file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 200) },
          ]);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Yükleme başarısız.');
        } finally {
          setBusy((count) => count - 1);
        }
      }),
    );
  };
  const zone = useDropzone((files) => void handle(files));
  const update = (index: number, patch: Partial<GalleryImage>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, delta: number) =>
    setItems((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  return (
    <div className="image-upload">
      <span className="image-upload-label" id={`${id}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.length ? (
        <ul className="gallery-upload-list">
          {items.map((item, index) => (
            <li key={`${item.url}-${index}`} className="gallery-upload-item">
              <img src={item.url} alt="" />
              <div className="gallery-upload-body">
                <label>
                  <span>Alt metin</span>
                  <input
                    type="text"
                    value={item.altText}
                    maxLength={220}
                    placeholder="Görselde ne var? (erişilebilirlik + SEO)"
                    onChange={(event) => update(index, { altText: event.target.value })}
                  />
                </label>
                <div className="gallery-upload-actions">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="image-upload-remove"
                    onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        aria-busy={busy > 0}
        className={`image-dropzone image-dropzone-compact ${zone.active ? 'is-active' : ''}`}
        onClick={() => zone.inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            zone.inputRef.current?.click();
          }
        }}
        onDragOver={zone.onDragOver}
        onDragLeave={zone.onDragLeave}
        onDrop={zone.onDrop}
      >
        <div className="image-dropzone-overlay">
          {busy > 0 ? (
            <span>{busy} görsel yükleniyor…</span>
          ) : (
            <span>
              <strong>Görselleri buraya sürükle</strong> veya tıklayıp seç (çoklu seçim)
              <small>JPEG, PNG, WebP, AVIF · her biri en fazla 15 MB</small>
            </span>
          )}
        </div>
        <input
          ref={zone.inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            void handle(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </div>
      <div className="image-upload-meta">
        {hint && !error ? <small>{hint}</small> : null}
        {error ? <small className="image-upload-error">{error}</small> : null}
      </div>
    </div>
  );
}
