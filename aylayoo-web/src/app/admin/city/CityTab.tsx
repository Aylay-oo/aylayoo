'use client';

import { useState } from 'react';
import type { CityKind } from '../../../lib/admin-api';
import { CityEditor } from './CityEditor';
import { CITY_RESOURCES, resourceFor } from './resources';

/* The "Хот" tab: a sub-tab per city resource.
 *
 * Only the open resource is mounted, for the same reason the public page mounts one tab —
 * six editors would fetch six lists to show one.
 */

export function CityTab({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [kind, setKind] = useState<CityKind>('itineraries');
  const resource = resourceFor(kind);

  return (
    <>
      <div className="filters admin-tabs admin-subtabs" role="tablist" aria-label="Хотын хэсэг">
        {CITY_RESOURCES.map((entry) => (
          <button
            key={entry.kind}
            role="tab"
            type="button"
            aria-selected={kind === entry.kind}
            aria-controls={`city-admin-${entry.kind}`}
            onClick={() => setKind(entry.kind)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <section id={`city-admin-${kind}`} role="tabpanel" aria-label={resource.label}>
        {/* Keyed on the kind so switching resource remounts the editor: its form state belongs
            to the resource it was opened for, and carrying it across would leave an itinerary's
            half-typed stops sitting in the phrasebook's form. */}
        <CityEditor
          key={kind}
          resource={resource}
          token={token}
          onUnauthorized={onUnauthorized}
        />
      </section>
    </>
  );
}
