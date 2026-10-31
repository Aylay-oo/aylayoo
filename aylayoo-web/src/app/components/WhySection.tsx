'use client';

import { useLang } from '../../lib/i18n';
import { StarSolidIcon, WhyChecklistIcon, WhyVerifiedIcon } from './icons';

/* The three selling points. Static copy, so it needs nothing from the API. */

const REASONS = [
  {
    Icon: WhyChecklistIcon,
    title: 'Интерактив чеклист',
    body: 'Очихыг хүссэн аймгаа сонгоод, үзэх газруудаа чеклистээр тэмдэглэхэд таны аялалд тохирсон хөтчийг шууд санал болгоно.',
  },
  {
    Icon: WhyVerifiedIcon,
    title: 'Туршлагатай хөтөч & компани',
    body: 'Салбартаа олон жил ажилласан, баталгаажсан хувь хөтөч болон аяллын тур операторуудын мэдээлэл нэг дор.',
  },
  {
    Icon: StarSolidIcon,
    title: 'Бодит үнэлгээ & сэтгэгдэл',
    body: 'Өмнө нь аялсан бодит аялагчдын 5 одтой үнэлгээ, сэтгэгдлийг харж, итгэлтэй сонголт хийгээрэй.',
  },
] as const;

export function WhySection() {
  const { t } = useLang();

  return (
    <section className="block" id="why">
      <div className="wrap">
        <div className="s-head">
          <span className="kicker">{t('Бидний давуу тал')}</span>
          <h2>{t('Яагаад «АЯЛЪЯ ӨӨ»-г сонгох вэ?')}</h2>
        </div>
        <div className="why-grid">
          {REASONS.map(({ Icon, title, body }) => (
            <div className="why" key={title}>
              <div className="why-ic">
                <Icon />
              </div>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
