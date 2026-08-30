'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@ilham/ui';

/**
 * Horizontal carousel affordance for rows that scroll sideways (category tiles on small screens).
 * The row itself is ordinary CSS overflow; this adds what makes it *read* as a carousel: edge
 * fades on the side that still has content, and prev/next buttons that page by ~80% of the
 * viewport. When everything fits (desktop grid) nothing extra is shown.
 */
export function ScrollRow({
  children,
  className = '',
  labels,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  labels: { prev: string; next: string };
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ scrollable: false, atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({
      scrollable: max > 8,
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft >= max - 4,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div
      className={`scroll-row ${className}`.trim()}
      data-scrollable={state.scrollable}
      data-at-start={state.atStart}
      data-at-end={state.atEnd}
    >
      <div className="scroll-row-viewport" ref={ref} role="region" aria-label={ariaLabel}>
        {children}
      </div>
      {state.scrollable && (
        <>
          <button
            type="button"
            className="scroll-row-btn scroll-row-prev"
            aria-label={labels.prev}
            onClick={() => page(-1)}
            disabled={state.atStart}
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <button
            type="button"
            className="scroll-row-btn scroll-row-next"
            aria-label={labels.next}
            onClick={() => page(1)}
            disabled={state.atEnd}
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </>
      )}
    </div>
  );
}
