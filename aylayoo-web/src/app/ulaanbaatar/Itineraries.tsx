'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { getCityItineraries, type ItineraryDays } from '../../lib/api';
import { ITINERARY_DAY_OPTIONS, dayCountMn } from '../../lib/city-labels';
import { useLang } from '../../lib/i18n';
import { useResource } from '../../lib/use-resource';
import { Panel } from './Panel';

/* The 1-, 2- and 3-day plans.
 *
 * The day filter is applied by the API rather than in the browser, so a visitor on a phone does
 * not download three itineraries to read one. That is also why `fetcher` is a useCallback keyed
 * on `days`: useResource takes the fetcher as its effect dependency, so changing the tab is
 * what triggers the refetch.
 */

export function Itineraries() {
  const { t, pick } = useLang();
  const [days, setDays] = useState<ItineraryDays | null>(null);
  const fetcher = useCallback(() => getCityItineraries(days ?? undefined), [days]);
  const itineraries = useResource(fetcher);

  return (
    <>
      <div className="radius-tabs city-daytabs" role="tablist" aria-label={t('Хоногийн тоо')}>
        <button
          role="tab"
          type="button"
          aria-selected={days === null}
          onClick={() => setDays(null)}
        >
          {t('Бүгд')}
        </button>
        {ITINERARY_DAY_OPTIONS.map((option) => (
          <button
            key={option}
            role="tab"
            type="button"
            aria-selected={days === option}
            onClick={() => setDays(option)}
          >
            {t(dayCountMn(option))}
          </button>
        ))}
      </div>

      <Panel
        resource={itineraries}
        label="Хөтөлбөрүүд ачаалагдлаа"
        empty={<div className="empty">{t('Одоохондоо хөтөлбөр нийтлээгүй байна.')}</div>}
      >
        {(rows) => (
          <div className="city-grid" aria-live="polite">
            {rows.map((itinerary) => (
              <article className="city-card-sm" key={itinerary.id}>
                <span className="tag">{t(dayCountMn(itinerary.days))}</span>
                <h3>
                  <Link href={`/ulaanbaatar/itineraries/${itinerary.id}`}>
                    {pick(itinerary.titleMn, itinerary.titleEn)}
                  </Link>
                </h3>
                {/* Falls back to the first stops when there is no summary, so a card is never
                    just a title — and names them rather than counting, since "Gandan,
                    Sukhbaatar Square" tells you more than "4 stops". */}
                <p>
                  {pick(itinerary.summaryMn, itinerary.summaryEn)
                    || itinerary.stops
                      .slice(0, 3)
                      .map((stop) => pick(stop.placeMn, stop.placeEn))
                      .join(', ')}
                </p>
                <div className="city-card-foot">
                  <span className="city-count">
                    {t(`${itinerary.stops.length} зогсоол`)}
                  </span>
                  <Link
                    className="linkbtn"
                    href={`/ulaanbaatar/itineraries/${itinerary.id}`}
                  >
                    {t('Дэлгэрэнгүй')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
