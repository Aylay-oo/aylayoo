'use client';

import { useMemo } from 'react';
import type { Aimag } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import {
  ISO_TO_SLUG, LABEL_FIX, PATHS, REGION, REGION_OF_API, TINY, type RegionKey,
} from '../../lib/static-data';
import { useTravelState } from '../../lib/travel-state';

/* Mongolia's 21 aimags plus Ulaanbaatar, as clickable SVG shapes.
 *
 * The outlines are static (Natural Earth, via the mockup) but everything drawn on top comes
 * from the API: which region colours a shape, and what its label says in the current
 * language. A shape with no matching aimag in the API is not drawn at all, exactly as the
 * design skipped codes missing from its AIMAG table.
 *
 * Each shape is a real button as far as assistive technology is concerned: role="button",
 * tabIndex 0, aria-pressed for its selected state, and Enter or Space to toggle — which is
 * what the design's keydown handler did.
 */

const UB_CODE = 'MN-1';

export function MongoliaMap({ aimags }: { aimags: Aimag[] }) {
  const { t, pick } = useLang();
  const { isSelected, activeCode, toggleAimag } = useTravelState();

  /** ISO code → the aimag row, so each shape can find its name and region. */
  const byCode = useMemo(() => {
    const map = new Map<string, Aimag>();
    for (const aimag of aimags) {
      const iso = aimag.isoCode ?? Object.entries(ISO_TO_SLUG)
        .find(([, slug]) => slug === aimag.slug)?.[0];
      if (iso) map.set(iso, aimag);
    }
    return map;
  }, [aimags]);

  const ub = PATHS[UB_CODE].c;

  return (
    <svg
      className="map-svg"
      id="map"
      viewBox="0 0 1000 495"
      role="group"
      aria-label={t('Монголын аймгуудын газрын зураг')}
    >
      {Object.entries(PATHS).map(([code, shape]) => {
        const aimag = byCode.get(code);
        /* The outlines are static, so the country is drawn from the first paint and only
         * the colours, labels and clicks wait on the API. A shape whose aimag the API does
         * not know stays grey and inert rather than pretending to be selectable. */
        if (!aimag) {
          return (
            <path key={code} d={shape.d} className="pending" aria-hidden="true" />
          );
        }
        const region: RegionKey = REGION_OF_API[aimag.region ?? ''] ?? 'center';
        const selected = isSelected(code);
        const name = pick(aimag.nameMn, aimag.nameEn);

        return (
          <path
            key={code}
            d={shape.d}
            className={[region, selected && 'sel', code === activeCode && 'active']
              .filter(Boolean)
              .join(' ')}
            tabIndex={0}
            role="button"
            aria-pressed={selected}
            aria-label={name}
            onClick={() => toggleAimag(code)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              // Space would otherwise scroll the page out from under the map.
              event.preventDefault();
              toggleAimag(code);
            }}
          >
            <title>{name}</title>
          </path>
        );
      })}

      {/* The capital's dot sits above the shapes and below the labels, as in the design. */}
      <circle className="ub-dot" cx={ub[0]} cy={ub[1]} r={5} />

      {Object.entries(PATHS).map(([code, shape]) => {
        const aimag = byCode.get(code);
        if (!aimag) return null;
        const region: RegionKey = REGION_OF_API[aimag.region ?? ''] ?? 'center';
        const [x, y] = LABEL_FIX[code] ?? shape.c;
        // The capital's label is always light, because its shape is nearly black.
        const light = isSelected(code) || region === 'cap';

        return (
          <text
            key={code}
            x={x}
            y={y}
            className={[TINY.has(code) && 'tiny', light && 'on'].filter(Boolean).join(' ')}
          >
            {code === UB_CODE ? t('УБ') : pick(aimag.nameMn, aimag.nameEn)}
          </text>
        );
      })}
    </svg>
  );
}

/** The colour key under the map. */
export function MapLegend() {
  const { t } = useLang();
  return (
    <ul className="legend">
      {(Object.keys(REGION) as RegionKey[]).map((key) => (
        <li key={key}>
          <i style={{ background: REGION[key].color }} />
          {t(REGION[key].name)}
        </li>
      ))}
    </ul>
  );
}
