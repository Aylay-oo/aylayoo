'use client';

import type { CityStop } from '../../lib/api';
import { TIME_OF_DAY_MN } from '../../lib/city-labels';
import { useLang } from '../../lib/i18n';

/* The stops of an itinerary or a walking route, in order.
 *
 * An <ol>, because the order is the meaning — the same reason the breadcrumb in DetailChrome is
 * one. This is the content of a route page; StopMap beside it is the picture, and is aria-hidden
 * precisely so a screen reader reads the route here once rather than twice.
 *
 * The numbers come from the list itself rather than being drawn, so they always match the
 * numbers on the map: StopMap labels a plotted stop with its index in the whole route, which
 * means stop 3 is "3" on both even when stop 2 had no coordinates to plot.
 */

export function StopList({ stops }: { stops: readonly CityStop[] }) {
  const { t, pick } = useLang();

  if (stops.length === 0) {
    return <p className="empty">{t('Зогсоол бүртгэгдээгүй байна.')}</p>;
  }

  return (
    <ol className="stop-list">
      {stops.map((stop, i) => {
        const note = pick(stop.noteMn, stop.noteEn);
        return (
          <li className="stop-item" key={`${i}-${stop.placeMn}`}>
            {/* aria-hidden: the <ol> already tells a screen reader which item this is, and
                hearing "3" before "third item" is noise. */}
            <span className="stop-num" aria-hidden="true">{i + 1}</span>
            <div className="stop-body">
              <b>{pick(stop.placeMn, stop.placeEn)}</b>
              {stop.timeOfDay && (
                <span className="stop-when">{t(TIME_OF_DAY_MN[stop.timeOfDay])}</span>
              )}
              {note && <span className="stop-note">{note}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
