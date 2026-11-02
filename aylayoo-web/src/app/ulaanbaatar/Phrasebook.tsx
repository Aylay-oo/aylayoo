'use client';

import { getPhrases } from '../../lib/api';
import { PHRASE_CATEGORIES, PHRASE_CATEGORY_MN } from '../../lib/city-labels';
import { useLang } from '../../lib/i18n';
import { useResource } from '../../lib/use-resource';
import { Panel } from './Panel';

/* The phrasebook.
 *
 * The one part of this page that does not change with the language switch, and deliberately so:
 * a phrasebook has to show the Mongolian, how to say it, and what it means, all three at once.
 * Hiding the English on the Mongolian side would make it useless to the Mongolian speaker
 * teaching a visitor to say it, and hiding the Cyrillic on the English side would leave nothing
 * to point at. So `pick` is not used here — only the headings translate.
 *
 * Grouped in PHRASE_CATEGORIES order, which runs easiest-first: somebody opening this on
 * arrival wants "hello" and "thank you" before they want to count.
 */

export function Phrasebook() {
  const { t } = useLang();
  const phrases = useResource(getPhrases);

  return (
    <Panel
      resource={phrases}
      label="Хэллэгүүд ачаалагдлаа"
      empty={<div className="empty">{t('Одоохондоо хэллэг нийтлээгүй байна.')}</div>}
    >
      {(rows) => {
        const groups = PHRASE_CATEGORIES
          .map((category) => ({
            category,
            items: rows.filter((phrase) => phrase.category === category),
          }))
          .filter(({ items }) => items.length > 0);

        const unknown = rows.filter(
          (phrase) => !(PHRASE_CATEGORIES as readonly string[]).includes(phrase.category),
        );

        return (
          <div className="city-phrases">
            {[...groups, ...(unknown.length ? [{ category: null, items: unknown }] : [])].map(
              ({ category, items }) => (
                <section className="city-topic" key={category ?? 'other'}>
                  <h3>{category ? t(PHRASE_CATEGORY_MN[category]) : t('Бусад')}</h3>
                  <ul className="phrase-list">
                    {items.map((phrase) => (
                      <li className="phrase" key={phrase.id}>
                        {/* lang on each part, so a screen reader switches voice rather than
                            reading Cyrillic with an English one — and so the Latin
                            pronunciation is not read as if it were English words. */}
                        <b lang="mn">{phrase.phraseMn}</b>
                        <span className="phrase-say" aria-label={t('Уншлага')}>
                          {phrase.pronunciation}
                        </span>
                        <span className="phrase-mean" lang="en">{phrase.meaningEn}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
          </div>
        );
      }}
    </Panel>
  );
}
