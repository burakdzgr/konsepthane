'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Site-wide dismissal for `<details>`-based dropdowns (account menu, language menu, collection
 * picker, report form, share menus…). Native `<details>` only closes when its summary is clicked
 * again; this closes every open *popover* details on outside click, Escape and route change, and
 * keeps popovers mutually exclusive. A details counts as a popover when its panel (first non-summary
 * child) is absolutely/fixed positioned — inline accordions (reply forms, FAQ) are left alone.
 */
function panelOf(details: HTMLDetailsElement) {
  return Array.from(details.children).find((child) => child.tagName !== 'SUMMARY') ?? null;
}
function isPopover(details: HTMLDetailsElement) {
  const panel = panelOf(details);
  if (!panel) return false;
  const position = getComputedStyle(panel).position;
  return position === 'absolute' || position === 'fixed';
}
function openPopovers() {
  return Array.from(document.querySelectorAll<HTMLDetailsElement>('details[open]')).filter(
    isPopover,
  );
}
function closeAll(except?: HTMLDetailsElement) {
  for (const details of openPopovers()) {
    if (except && (details === except || details.contains(except) || except.contains(details)))
      continue;
    details.removeAttribute('open');
  }
}

export function DropdownDismiss() {
  const pathname = usePathname();
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      for (const details of openPopovers()) {
        if (!target || !details.contains(target)) details.removeAttribute('open');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll();
    };
    // `toggle` does not bubble; a capturing listener on the document still receives it.
    const onToggle = (event: Event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.open || !isPopover(details)) return;
      closeAll(details);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('toggle', onToggle, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('toggle', onToggle, true);
    };
  }, []);
  useEffect(() => {
    closeAll();
  }, [pathname]);
  return null;
}
