'use client';

import type { CityStop } from '../../lib/api';
import { useLang } from '../../lib/i18n';

/* A walking route drawn as inline SVG, the same way MongoliaMap draws the country.
 *
 * No map library and no tile server, which is a deliberate choice rather than a shortcut. This
 * app has exactly three runtime dependencies, the whole page is built to render with the API
 * down, and a tile layer would add a third-party request on every view plus an SSR-unsafe
 * import. What a reader needs from this picture is the shape of the walk and the order of the
 * stops, and a projection of the coordinates gives both.
 *
 * It is decorative by construction: the SVG is aria-hidden and the ordered list beside it
 * (StopList) is the real content. A route whose stops have no coordinates renders no map at
 * all, and loses nothing but the picture.
 */

/** The drawing surface. A viewBox, so the rendered size is the stylesheet's business. */
export const VIEW = { w: 640, h: 400, pad: 46 } as const;

export type PlottedStop = {
  /** Its position in the whole route, 1-based — so a gap means that stop had no coordinates. */
  label: number;
  x: number;
  y: number;
  stop: CityStop;
};

type LocatedStop = { label: number; stop: CityStop; lat: number; lng: number };

/**
 * Projects the stops that have coordinates onto the drawing surface.
 *
 * Fitted to the route's own bounding box rather than a fixed extent for Ulaanbaatar: a route
 * around one neighbourhood then fills the frame instead of huddling in a corner of the city.
 *
 * Exported and pure so city-labels-style specs can check the geometry without a DOM.
 */
export function projectStops(
  stops: readonly CityStop[],
  box: { w: number; h: number; pad: number } = VIEW,
): PlottedStop[] {
  const located: LocatedStop[] = [];
  stops.forEach((stop, i) => {
    // Both-or-neither is enforced by the API; this still checks both, because a row written by
    // hand could carry one.
    if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
      located.push({ label: i + 1, stop, lat: stop.lat, lng: stop.lng });
    }
  });
  if (located.length === 0) return [];

  const lats = located.map((s) => s.lat);
  const lngs = located.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  /* A degree of longitude is shorter than a degree of latitude by cos(latitude) — at
   * Ulaanbaatar's 48°N, about two thirds as long. Without this the walk comes out stretched
   * east-west and a square block looks like a wide rectangle. */
  const squash = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = (maxLng - minLng) * squash;
  const spanY = maxLat - minLat;

  const innerW = box.w - box.pad * 2;
  const innerH = box.h - box.pad * 2;

  /* One scale for both axes. Fitting each axis separately would fill the frame but distort the
   * route, which is the one thing this picture is for. Infinity for a zero span so a route that
   * runs due east, or a single stop, falls through to the other axis rather than dividing by
   * zero; if both are zero the scale is 0 and everything lands dead centre. */
  const fitX = spanX > 0 ? innerW / spanX : Infinity;
  const fitY = spanY > 0 ? innerH / spanY : Infinity;
  const scale = Number.isFinite(fitX) || Number.isFinite(fitY) ? Math.min(fitX, fitY) : 0;

  // Centre whatever the route actually occupies in the frame.
  const originX = (box.w - spanX * scale) / 2;
  const originY = (box.h - spanY * scale) / 2;

  return located.map(({ label, stop, lat, lng }) => ({
    label,
    stop,
    x: originX + (lng - minLng) * squash * scale,
    // SVG's y grows downward while latitude grows north, so this subtracts from the top.
    y: originY + (maxLat - lat) * scale,
  }));
}

export function StopMap({ stops }: { stops: readonly CityStop[] }) {
  const { t } = useLang();
  const plotted = projectStops(stops);

  // Nothing to draw. The ordered list beside this is the content either way.
  if (plotted.length === 0) return null;

  const path = plotted.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <figure className="stop-map">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="stop-map-svg"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        {/* Only drawn from two stops up; a single marker needs no line to itself. */}
        {plotted.length > 1 && <polyline className="stop-map-line" points={path} />}

        {plotted.map((p) => (
          <g key={`${p.label}-${p.stop.placeMn}`} transform={`translate(${p.x} ${p.y})`}>
            <circle className="stop-map-dot" r={15} />
            {/* dominant-baseline rather than a dy guess, so the digit sits centred in the
                circle at any rendered size. */}
            <text className="stop-map-num" textAnchor="middle" dominantBaseline="central">
              {p.label}
            </text>
          </g>
        ))}
      </svg>

      {/* The figure's accessible name, and the one thing worth saying about the picture that
          the ordered list below it does not already say: that it may be showing fewer stops
          than the route has, because a stop without coordinates cannot be plotted. */}
      <figcaption className="stop-map-cap">
        {plotted.length < stops.length
          ? t(`${plotted.length}/${stops.length} зогсоол зураг дээр`)
          : t('Зогсоолуудын байршил')}
      </figcaption>
    </figure>
  );
}
