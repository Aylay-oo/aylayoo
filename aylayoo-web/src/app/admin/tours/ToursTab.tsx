'use client';

import { useState } from 'react';
import { ConsentPanel } from './ConsentPanel';
import { TourEditor } from './TourEditor';

/* The "Хөтөчтэй аялал" tab: the tours, and the consent that governs them.
 *
 * Two sub-tabs rather than two top-level tabs, because they are one subject. A tour cannot be
 * published until its guide has consented, and revoking consent unpublishes their tours — so
 * an admin who opens one of these screens very often needs the other, and splitting them
 * across the top bar would hide that relationship.
 *
 * Mongolian only, like the rest of /admin.
 */

type Sub = 'tours' | 'consent';

const SUBS: readonly { key: Sub; label: string }[] = [
  { key: 'tours', label: 'Аялалууд' },
  { key: 'consent', label: 'Хөтчийн зөвшөөрөл' },
];

export function ToursTab({ token, onUnauthorized }: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [sub, setSub] = useState<Sub>('tours');

  return (
    <>
      <div className="filters admin-tabs admin-subtabs" role="tablist" aria-label="Аялалын хэсэг">
        {SUBS.map((entry) => (
          <button
            key={entry.key}
            role="tab"
            type="button"
            aria-selected={sub === entry.key}
            aria-controls={`tours-admin-${entry.key}`}
            onClick={() => setSub(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <section
        id={`tours-admin-${sub}`}
        role="tabpanel"
        aria-label={SUBS.find((entry) => entry.key === sub)?.label ?? 'Аялалууд'}
      >
        {sub === 'tours' ? (
          <TourEditor token={token} onUnauthorized={onUnauthorized} />
        ) : (
          <ConsentPanel token={token} onUnauthorized={onUnauthorized} />
        )}
      </section>
    </>
  );
}
