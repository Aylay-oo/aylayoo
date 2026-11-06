'use client';

import Link from 'next/link';
import { getCityTours, type CityTour } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { useResource } from '../../lib/use-resource';
import { Panel } from './Panel';

/* The "Хөтөчтэй аялал" tab: short city tours led by a named guide.
 *
 * The first tab on this page whose rows are about a *person* rather than about the city, which
 * changes what the card has to say. An itinerary card can be a title and a list of stops; a
 * tour card has to make clear whose tour it is, because deciding to spend three hours with a
 * stranger is the decision being made here.
 *
 * What the card deliberately does NOT show: a price. The API has no price column — see
 * decision 5 in the Phase 3 plan — because a price is a fact about someone's business and we
 * would be inventing it.
 *
 * `rating` and `reviewCount` are read with `!= null`, not `!== null`. The API omits both keys
 * until a guide has three published reviews, and `undefined !== null` is true, which is
 * precisely the bug that would have called `.toFixed()` on undefined for every guide card on
 * the live site. See the same note in GuideCard.tsx.
 */

/** "90 мин" below an hour, "2 цаг" on the hour, "1 цаг 30 мин" in between. */
export function durationMn(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} цаг` : `${hours} цаг ${rest} мин`;
}

export function Tours() {
  const { t } = useLang();
  const tours = useResource(getCityTours);

  return (
    <Panel
      resource={tours}
      label="Аялалууд ачаалагдлаа"
      empty={<div className="empty">{t('Одоохондоо хөтөчтэй аялал нийтлээгүй байна.')}</div>}
    >
      {(rows) => (
        <div className="city-grid" aria-live="polite">
          {rows.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function TourCard({ tour }: { tour: CityTour }) {
  const { t, pick } = useLang();
  const href = `/ulaanbaatar/tours/${tour.id}`;

  return (
    <article className="city-card-sm tour-card">
      {tour.durationMinutes != null && (
        <span className="tag">{t(durationMn(tour.durationMinutes))}</span>
      )}
      <h3>
        <Link href={href}>{pick(tour.titleMn, tour.titleEn)}</Link>
      </h3>

      {/* Falls back to the stops rather than leaving the card as a bare title, the same way an
          itinerary card does. */}
      <p>
        {pick(tour.summaryMn, tour.summaryEn)
          || tour.stops.slice(0, 3).map((stop) => pick(stop.placeMn, stop.placeEn)).join(', ')}
      </p>

      <div className="tour-guide">
        <b>{tour.guide.name}</b>
        {tour.guide.rating != null && (
          <span className="rt">
            <span className="star">★</span> {tour.guide.rating.toFixed(1)}
            {tour.guide.reviewCount != null && <span> ({tour.guide.reviewCount})</span>}
          </span>
        )}
        {tour.guide.languages.length > 0 && (
          <span className="admin-muted">{t(tour.guide.languages.join(', '))}</span>
        )}
      </div>

      <div className="city-card-foot">
        <span className="city-count">{t(`${tour.stops.length} зогсоол`)}</span>
        <Link className="linkbtn" href={href}>{t('Дэлгэрэнгүй')}</Link>
      </div>
    </article>
  );
}
