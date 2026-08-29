'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function anchorTarget(hash: string) {
  if (!hash || hash === '#') return null;

  let name = hash.slice(1);
  try {
    name = decodeURIComponent(name);
  } catch {
    // Keep the literal fragment when it is not valid percent-encoded text.
  }

  return document.getElementById(name) ?? document.getElementsByName(name).item(0);
}

function focusWithoutJump(target: HTMLElement) {
  const needsTemporaryTabIndex = !target.hasAttribute('tabindex') && target.tabIndex < 0;
  if (needsTemporaryTabIndex) target.setAttribute('tabindex', '-1');

  target.focus({ preventScroll: true });

  if (needsTemporaryTabIndex) {
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
}

function scrollToAnchor(hash: string) {
  const target = anchorTarget(hash);
  if (!(target instanceof HTMLElement)) return false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  focusWithoutJump(target);
  return true;
}

export function NavigationMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.download || (anchor.target && anchor.target !== '_self')) return;

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const isSameDocument =
        destination.origin === current.origin &&
        destination.pathname === current.pathname &&
        destination.search === current.search;

      if (!isSameDocument || !destination.hash || !anchorTarget(destination.hash)) return;

      event.preventDefault();
      if (destination.hash !== current.hash) {
        window.history.pushState(null, '', destination.hash);
      }
      scrollToAnchor(destination.hash);
    };

    // Capture before Next.js Link handles the click, then stop its route-level scroll logic by
    // preventing the native action. This keeps same-page fragments on the dedicated smooth path.
    document.addEventListener('click', handleAnchorClick, true);
    return () => document.removeEventListener('click', handleAnchorClick, true);
  }, []);

  useEffect(() => {
    if (!window.location.hash) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => scrollToAnchor(window.location.hash));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [pathname]);

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
