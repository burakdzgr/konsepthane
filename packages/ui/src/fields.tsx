'use client';

import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

function describe(length: number, min?: number, max?: number) {
  if (min && length < min)
    return {
      text: `En az ${min} karakter · ${min - length} karakter daha`,
      state: 'short' as const,
    };
  if (max && length > max)
    return {
      text: `En fazla ${max} karakter · ${length - max} karakter fazla`,
      state: 'long' as const,
    };
  if (max) return { text: `${length}/${max} karakter`, state: 'ok' as const };
  if (min) return { text: `${length} karakter · en az ${min}`, state: 'ok' as const };
  return { text: `${length} karakter`, state: 'ok' as const };
}

/**
 * Textarea with a live character counter. Shows the minimum before it is met and the maximum
 * while typing, so validation limits are visible before submit.
 */
export function TextArea({
  label,
  hint,
  minLength,
  maxLength,
  className,
  defaultValue,
  onChange,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string | undefined;
  hint?: string | undefined;
}) {
  const id = useId();
  const [length, setLength] = useState(String(defaultValue ?? '').length);
  const counter = describe(length, minLength ?? undefined, maxLength ?? undefined);
  const touched = length > 0;
  return (
    <div className="field-group">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <textarea
        id={id}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-describedby={`${id}-count`}
        className={clsx('field field-textarea', className)}
        onChange={(event) => {
          setLength(event.currentTarget.value.length);
          onChange?.(event);
        }}
        {...props}
      />
      <div className="field-meta">
        {hint && <span className="field-hint">{hint}</span>}
        <span
          id={`${id}-count`}
          aria-live="polite"
          className={clsx(
            'field-count',
            touched && counter.state === 'short' && 'is-short',
            counter.state === 'long' && 'is-long',
            touched && counter.state === 'ok' && 'is-ok',
          )}
        >
          {counter.text}
        </span>
      </div>
    </div>
  );
}

/** Text input with the same live counter for title-like fields. */
export function TextInput({
  label,
  hint,
  minLength,
  maxLength,
  className,
  defaultValue,
  onChange,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string | undefined;
  hint?: string | undefined;
}) {
  const id = useId();
  const [length, setLength] = useState(String(defaultValue ?? '').length);
  const counter = describe(length, minLength ?? undefined, maxLength ?? undefined);
  const touched = length > 0;
  return (
    <div className="field-group">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <input
        id={id}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-describedby={`${id}-count`}
        className={clsx('field', className)}
        onChange={(event) => {
          setLength(event.currentTarget.value.length);
          onChange?.(event);
        }}
        {...props}
      />
      {(minLength || maxLength || hint) && (
        <div className="field-meta">
          {hint && <span className="field-hint">{hint}</span>}
          <span
            id={`${id}-count`}
            aria-live="polite"
            className={clsx(
              'field-count',
              touched && counter.state === 'short' && 'is-short',
              counter.state === 'long' && 'is-long',
              touched && counter.state === 'ok' && 'is-ok',
            )}
          >
            {counter.text}
          </span>
        </div>
      )}
    </div>
  );
}
