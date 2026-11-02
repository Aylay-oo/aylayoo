'use client';

import { getCityFood } from '../../lib/api';
import { PRICE_LEVEL_MN, PRICE_LEVEL_SYMBOL } from '../../lib/city-labels';
import { useLang } from '../../lib/i18n';
import { useResource } from '../../lib/use-resource';
import { Panel } from './Panel';

/* Where to eat.
 *
 * This tab ships empty, and its empty state is written to be read rather than apologised for.
 * A restaurant's prices, what it is good at and when it opens are facts about somebody else's
 * business; filling them in from guesswork would put wrong information about their livelihood
 * on the site and send visitors to a door that is shut. The team adds the rows in /admin, and
 * until they do this says so plainly.
 */

export function Food() {
  const { t, pick } = useLang();
  const food = useResource(getCityFood);

  return (
    <Panel
      resource={food}
      label="Хоолны газрууд ачаалагдлаа"
      empty={(
        <div className="empty city-empty">
          <b>{t('Хоолны газруудыг бэлтгэж байна.')}</b>
          <span>
            {t('Манай баг шалгаж, тодорхой мэдээлэлтэйгээр нэмэх хүртэл энэ хэсэг хоосон байна.')}
          </span>
        </div>
      )}
    >
      {(rows) => (
        <ul className="city-list">
          {rows.map((place) => {
            const area = pick(place.areaMn, place.areaEn);
            const category = pick(place.categoryMn, place.categoryEn);
            const knownFor = pick(place.knownForMn, place.knownForEn);

            return (
              <li className="city-row" key={place.id}>
                <div className="city-row-top">
                  <b>{pick(place.nameMn, place.nameEn)}</b>
                  {category && <span className="tag">{category}</span>}
                  {/* The symbols are the quick read; the word next to them is what a screen
                      reader gets, since "₮₮" has no useful pronunciation. */}
                  {place.priceLevel && (
                    <span className="city-price">
                      <span aria-hidden="true">{PRICE_LEVEL_SYMBOL[place.priceLevel]}</span>
                      <span className="sr">{t(PRICE_LEVEL_MN[place.priceLevel])}</span>
                    </span>
                  )}
                </div>
                {knownFor && <p>{knownFor}</p>}
                {/* Left out entirely rather than printed as a dash when empty, the same way
                    the admin cards treat a missing field. */}
                {area && <span className="city-row-meta">{area}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
