import Image from 'next/image';
import type { CSSProperties } from 'react';
import { displayMediaSrc } from '@/lib/media-url';

/**
 * `next/image` with the project's conventions baked in:
 * - Fills its positioned parent (cards, hero tiles and galleries already fix an aspect ratio in
 *   CSS), so every image has intrinsic dimensions and never shifts layout.
 * - Uses `sizes` so the optimizer serves a width that matches the slot, not the original file.
 * - SVG placeholders are served as-is (the optimizer does not rasterise SVG).
 * - `priority` marks the LCP candidate (hero / first gallery image); everything else lazy-loads.
 *
 * Accepts the same props the previous raw `<img>` usages passed, so it can be dropped in as the
 * `ImageComponent` of `@ilham/ui` cards.
 */
export function SmartImage({
  src,
  alt,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  loading,
  fetchPriority,
  className,
  style,
  quality,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  /** Accepted for `<img>` compatibility; `priority` wins, otherwise images lazy-load. */
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  className?: string;
  style?: CSSProperties;
  quality?: number;
}) {
  const source = displayMediaSrc(src);
  const isSvg = /\.svg(\?.*)?$/i.test(source);
  const eager = priority || loading === 'eager' || fetchPriority === 'high';
  return (
    <Image
      src={source}
      alt={alt}
      fill
      sizes={sizes}
      priority={eager}
      unoptimized={isSvg}
      className={className}
      style={{ objectFit: 'cover', ...style }}
      {...(quality ? { quality } : {})}
    />
  );
}

export const cardSizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';
export const heroSizes = '(max-width: 1024px) 100vw, 440px';
export const gallerySizes = '(max-width: 1024px) 100vw, 800px';
