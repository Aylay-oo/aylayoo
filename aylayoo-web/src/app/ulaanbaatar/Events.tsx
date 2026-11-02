'use client';

import { getCityEvents, type CityEvent } from '../../lib/api';
import { formatEventDates, isThisWeek } from '../../lib/city-labels';
import { safeHttpUrl } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { useResource } from '../../lib/use-resource';
import { Panel } from './Panel';

/* What is on in the city.
 *
 * Ships empty, like the food tab, and for the same reason: an event we were not told about is
 * not a fact, and sending somebody across town to something that is not happening is worse than
 * showing them nothing. The team adds events in /admin.
 *
 * The API already drops anything that has finished and sorts soonest-first, so the only work
 * here is splitting "on this week" from "later" — which is the question somebody standing in
 * Ulaanbaatar is actually asking.
 */

export function Events() {
  const { t } = useLang();
  const events = useResource(getCityEvents);

  /* Read once per render rather than per event, so a list cannot straddle midnight and show
   * the same event in both groups. */
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Panel
      resource={events}
      label="Арга хэмжээнүүд ачаалагдлаа"
      empty={(
        <div className="empty city-empty">
          <b>{t('Энэ долоо хоногт нийтэлсэн арга хэмжээ байхгүй.')}</b>
          <span>{t('Манай баг баталгаажсан арга хэмжээг тогтмол нэмж байна.')}</span>
        </div>
      )}
    >
      {(rows) => {
        const thisWeek = rows.filter((event) => isThisWeek(event, today));
        const later = rows.filter((event) => !isThisWeek(event, today));

        return (
          <div className="city-events">
            {thisWeek.length > 0 && (
              <section className="city-topic">
                <h3>{t('Энэ долоо хоногт')}</h3>
                <ul className="city-list">
                  {thisWeek.map((event) => <EventRow event={event} key={event.id} />)}
                </ul>
              </section>
            )}

            {later.length > 0 && (
              <section className="city-topic">
                <h3>{t('Дараагийн арга хэмжээнүүд')}</h3>
                <ul className="city-list">
                  {later.map((event) => <EventRow event={event} key={event.id} />)}
                </ul>
              </section>
            )}
          </div>
        );
      }}
    </Panel>
  );
}

function EventRow({ event }: { event: CityEvent }) {
  const { t, pick, lang } = useLang();
  /* The API already refuses a non-http(s) link, but this guards rows stored before that rule
   * and anything written to the database by hand — the same reason a guide's website is
   * checked again at render time. */
  const link = safeHttpUrl(event.link);
  const place = pick(event.placeMn, event.placeEn);
  const description = pick(event.descriptionMn, event.descriptionEn);

  return (
    <li className="city-row">
      <div className="city-row-top">
        <b>{pick(event.titleMn, event.titleEn)}</b>
        {/* A <time> so the machine-readable date is the stored one, whatever the display
            language has done to it. dateTime takes the start; a range has no single value. */}
        <time className="tag" dateTime={event.startDate}>
          {formatEventDates(event.startDate, event.endDate, lang)}
        </time>
      </div>
      {description && <p>{description}</p>}
      {place && <span className="city-row-meta">{place}</span>}
      {link && (
        <a className="f-linkbtn" href={link} target="_blank" rel="noopener noreferrer">
          {t('Дэлгэрэнгүй мэдээлэл')}
        </a>
      )}
    </li>
  );
}
