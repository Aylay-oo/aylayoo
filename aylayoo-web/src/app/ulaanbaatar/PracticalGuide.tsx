'use client';

import { getCityTips, type CityTip } from '../../lib/api';
import { TIP_TOPICS, TIP_TOPIC_MN } from '../../lib/city-labels';
import { useLang } from '../../lib/i18n';
import { useResource } from '../../lib/use-resource';
import { Panel } from './Panel';

/* The practical guide, grouped by topic.
 *
 * The API returns one flat list and the grouping happens here, so a new topic is a change in
 * one enum rather than a new endpoint. TIP_TOPICS fixes the order of the headings — the brief's
 * order — instead of letting it fall out of whatever the rows happen to be, so publishing a
 * weather tip cannot push transport below it.
 *
 * A topic with no published tips is left out rather than shown as an empty heading.
 */

export function PracticalGuide() {
  const { t, pick } = useLang();
  const tips = useResource(getCityTips);

  return (
    <Panel
      resource={tips}
      label="Хэрэгтэй мэдээлэл ачаалагдлаа"
      empty={<div className="empty">{t('Одоохондоо хэрэгтэй мэдээлэл нийтлээгүй байна.')}</div>}
    >
      {(rows) => {
        const byTopic = TIP_TOPICS
          .map((topic) => ({ topic, items: rows.filter((tip) => tip.topic === topic) }))
          .filter(({ items }) => items.length > 0);

        /* Any topic the enum does not know about — a row written by hand, or an enum this
         * front end has not been redeployed for. Shown under its own raw key rather than
         * silently dropped, so a published tip is never invisible. */
        const unknown = rows.filter(
          (tip) => !(TIP_TOPICS as readonly string[]).includes(tip.topic),
        );

        return (
          <div className="city-guide">
            {byTopic.map(({ topic, items }) => (
              <section className="city-topic" key={topic}>
                <h3>{t(TIP_TOPIC_MN[topic])}</h3>
                <dl>
                  {items.map((tip) => (
                    <div className="city-tip" key={tip.id}>
                      <dt>{pick(tip.titleMn, tip.titleEn)}</dt>
                      <dd>{pick(tip.bodyMn, tip.bodyEn)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            {unknown.length > 0 && (
              <section className="city-topic">
                <h3>{t('Бусад')}</h3>
                <dl>
                  {unknown.map((tip: CityTip) => (
                    <div className="city-tip" key={tip.id}>
                      <dt>{pick(tip.titleMn, tip.titleEn)}</dt>
                      <dd>{pick(tip.bodyMn, tip.bodyEn)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        );
      }}
    </Panel>
  );
}
