'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Icon } from '@ilham/ui';

export type DiscoveryTab = {
  key: string;
  label: string;
  /** Number of items in the panel; 0 hides the "more" link for that tab. */
  count: number;
  /** Server-rendered panel (ConceptGrid or empty state). */
  panel: ReactNode;
  /** Where "more" leads for this view (plain string: functions cannot cross to the client). */
  moreHref: string;
};

/**
 * Home "Fikirleri keşfet": the three sort views are prerendered on the server and switched here
 * without a navigation. "More" only appears when the active view actually has concepts.
 */
export function DiscoveryTabs({
  tabs,
  ariaLabel,
  moreLabel,
}: {
  tabs: DiscoveryTab[];
  ariaLabel: string;
  moreLabel: string;
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? '');
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];
  return (
    <>
      <div className="discovery-tabs" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === active}
            className={tab.key === active ? 'is-active' : undefined}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} role="tabpanel" hidden={tab.key !== active}>
          {tab.panel}
        </div>
      ))}
      {current && current.count > 0 && (
        <div className="mt-2 text-center">
          <Link href={current.moreHref} className="btn btn-ghost">
            {moreLabel} <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
