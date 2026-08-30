'use client';

import { useEffect, useState } from 'react';

/**
 * Search field whose placeholder adapts to the viewport: the long example text is truncated on
 * phones, so a shorter variant is used below 640px (server renders the short one first, which
 * is the safe default; wide screens upgrade after hydration).
 */
export function HeroSearchInput({
  id,
  name,
  placeholder,
  placeholderShort,
}: {
  id: string;
  name: string;
  placeholder: string;
  placeholderShort: string;
}) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return (
    <input
      id={id}
      name={name}
      type="search"
      placeholder={wide ? placeholder : placeholderShort}
      autoComplete="off"
    />
  );
}
