'use client';

import { useMemo } from 'react';
import type { Guide } from '../../lib/api';
import { useDialogs } from '../../lib/dialogs';
import { useLang } from '../../lib/i18n';
import { FILTER_TO_TYPE } from '../../lib/static-data';
import { useTravelState, type GuideFilter } from '../../lib/travel-state';
import { useFlowCarousel } from '../../lib/use-flow-carousel';
import type { Resource } from '../../lib/use-resource';
import { GuideCard } from './GuideCard';
import { ChevronLeftIcon, ChevronRightIcon, GuidePersonIcon } from './icons';
import { GuideCardSkeletons, Notice } from './SectionState';

/* The guides, drifting past in a marquee.
 *
 * Filtering happens in memory rather than by refetching per type: the recommendation scoring
 * in the checklist needs the whole set anyway, and refetching would restart the marquee on
 * every filter click. The API's page cap is 50, which is where paging would go if this ever
 * lists more people than that.
 */

const FILTERS: readonly { key: GuideFilter; label: string }[] = [
  { key: 'all', label: 'Бүгд' },
  { key: 'guide', label: 'Аяллын хөтөч нар' },
  { key: 'driver', label: 'Туршлагатай жолооч нар' },
  { key: 'company', label: 'Аяллын компаниуд' },
];

export function GuidesSection({ guides }: { guides: Resource<Guide[]> }) {
  const { t } = useLang();
  const { guideFilter, setGuideFilter } = useTravelState();

  const all = guides.data ?? [];
  const shown = useMemo(
    () => (guideFilter === 'all'
      ? all
      : all.filter((guide) => guide.type === FILTER_TO_TYPE[guideFilter])),
    [all, guideFilter],
  );

  return (
    <section className="block" id="guides">
      <div className="wrap">
        <div className="s-head center">
          <span className="kicker">{t('Шалгагдсан мэргэжилтнүүд')}</span>
          <h2>{t('Манай хөтөч & жолооч нар')}</h2>
          <p>
            {t('АЯЛЪЯ ӨӨ-ийн баталгаажуулсан, олон жилийн туршлагатай хөтөч болон найдвартай жолооч нараас сонгож аяллаа аюулгүй, тухтай болгоорой.')}
          </p>
        </div>

        {/* The filters are pointless with nobody registered, and a row of buttons that all
            lead to the same empty state reads as broken. */}
        {all.length > 0 && (
          <div className="filters" role="group" aria-label={t('Шүүлтүүр')}>
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={guideFilter === key}
                onClick={() => setGuideFilter(key)}
              >
                {t(label)}
              </button>
            ))}
          </div>
        )}

        {guides.loading && (
          <div className="guide-grid">
            <GuideCardSkeletons count={4} />
          </div>
        )}

        {!guides.loading && guides.error && (
          <Notice message="Хөтчийн мэдээлэл ачаалахад алдаа гарлаа" onRetry={guides.reload} />
        )}

        {!guides.loading && !guides.error && (
          all.length === 0
            ? <NoGuidesYet />
            : shown.length === 0
              ? <NoneOfThisKind />
              : <GuideMarquee guides={shown} />
        )}
      </div>
    </section>
  );
}

/**
 * Nobody has registered yet — which is how the site launches, once the pre-launch sample
 * guides are deleted. An empty marquee would look broken, so this says what is happening and
 * offers the one useful action.
 */
function NoGuidesYet() {
  const { t } = useLang();
  const { openRegister } = useDialogs();

  return (
    <div className="guides-empty">
      <div className="city-ic">
        <GuidePersonIcon size={28} />
      </div>
      <h3>{t('Хөтчүүд удахгүй нэмэгдэнэ')}</h3>
      <p>{t('Одоогоор баталгаажсан хөтөч бүртгэгдээгүй байна. Та хөтөч, жолооч эсвэл аяллын компани бол өөрийгөө бүртгүүлээрэй — бид шалгаад сайт дээр нэмнэ.')}</p>
      <button className="btn btn-primary" type="button" onClick={openRegister}>
        {t('Хөтчөөр бүртгүүлэх')}
      </button>
    </div>
  );
}

/** There are guides, just none of the kind currently filtered for. */
function NoneOfThisKind() {
  const { t } = useLang();
  const { setGuideFilter } = useTravelState();

  return (
    <div className="empty">
      {t('Энэ төрлийн хөтөч одоохондоо алга.')}{' '}
      <button className="linkbtn" type="button" onClick={() => setGuideFilter('all')}>
        {t('Бүгдийг харах')}
      </button>
    </div>
  );
}

function GuideMarquee({ guides }: { guides: Guide[] }) {
  const { t } = useLang();
  const { rootRef, viewRef, trackRef, isStatic, next, prev, handlers } = useFlowCarousel({
    itemCount: guides.length,
    speed: 36,
  });

  return (
    <>
      <div
        ref={rootRef}
        className={`carousel flowing${isStatic ? ' static' : ''}`}
        id="guideCar"
        aria-roledescription="carousel"
        aria-label={t('Хөтөч, жолооч нар')}
        {...handlers}
      >
        <button className="car-btn prev" type="button" onClick={prev} aria-label={t('Өмнөх')}>
          <ChevronLeftIcon />
        </button>
        <button className="car-btn next" type="button" onClick={next} aria-label={t('Дараах')}>
          <ChevronRightIcon />
        </button>
        <div className="car-view" ref={viewRef}>
          <div className="car-track" ref={trackRef}>
            {guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
            {/* The second copy is what makes the wrap seamless. It is inert and hidden from
                assistive technology, so nobody meets the same guide twice. */}
            {!isStatic && guides.map((guide) => (
              <GuideCard key={`clone-${guide.id}`} guide={guide} clone />
            ))}
          </div>
        </div>
      </div>
      {/* The hint only describes something that is actually happening. */}
      {!isStatic && (
        <p className="car-hint">{t('Хулганаа карт дээр аваачихад зогсоно. Сумаар нааш цааш гүйлгэж болно.')}</p>
      )}
    </>
  );
}
