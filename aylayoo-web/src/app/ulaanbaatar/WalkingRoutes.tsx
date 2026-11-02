'use client';

import Link from 'next/link';
import { getCityRoutes } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { useResource } from '../../lib/use-resource';
import { StopMap } from '../components/StopMap';
import { Panel } from './Panel';

/* The themed walking routes, each with its projected map.
 *
 * The map is drawn on the card as well as on the route's own page: the shape of a walk is what
 * tells you whether it is a loop round one neighbourhood or a line across town, and that is
 * most useful while you are still choosing. StopMap renders nothing at all when no stop has
 * coordinates, so a card without them is just a card.
 */

export function WalkingRoutes() {
  const { t, pick } = useLang();
  const routes = useResource(getCityRoutes);

  return (
    <Panel
      resource={routes}
      label="Маршрутууд ачаалагдлаа"
      empty={<div className="empty">{t('Одоохондоо явган маршрут нийтлээгүй байна.')}</div>}
    >
      {(rows) => (
        <div className="city-grid">
          {rows.map((route) => (
            <article className="city-card-sm city-card-route" key={route.id}>
              <StopMap stops={route.stops} />
              <h3>
                <Link href={`/ulaanbaatar/routes/${route.id}`}>
                  {pick(route.titleMn, route.titleEn)}
                </Link>
              </h3>
              <p>
                {pick(route.summaryMn, route.summaryEn)
                  || route.stops.map((stop) => pick(stop.placeMn, stop.placeEn)).join(' → ')}
              </p>
              <div className="city-card-foot">
                <span className="city-count">{t(`${route.stops.length} зогсоол`)}</span>
                <Link className="linkbtn" href={`/ulaanbaatar/routes/${route.id}`}>
                  {t('Дэлгэрэнгүй')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
