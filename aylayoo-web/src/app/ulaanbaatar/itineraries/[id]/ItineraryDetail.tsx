'use client';

import Link from 'next/link';
import type { CityItinerary } from '../../../../lib/api';
import { dayCountMn } from '../../../../lib/city-labels';
import { LangProvider, useLang } from '../../../../lib/i18n';
import { pageTitle } from '../../../../lib/seo';
import { DetailChrome } from '../../../components/DetailChrome';
import { StopList } from '../../../components/StopList';
import { StopMap } from '../../../components/StopMap';

function Body({ itinerary }: { itinerary: CityItinerary }) {
  const { t, pick } = useLang();
  const title = pick(itinerary.titleMn, itinerary.titleEn);

  return (
    <DetailChrome
      crumbs={[
        { label: t('Нүүр'), href: '/' },
        { label: t('Улаанбаатар'), href: '/ulaanbaatar' },
        { label: title },
      ]}
    >
      <article className="d-card">
        <h1>{title}</h1>
        <span className="d-flag">{t(dayCountMn(itinerary.days))}</span>

        {(itinerary.summaryMn || itinerary.summaryEn) && (
          <p className="d-lede">{pick(itinerary.summaryMn, itinerary.summaryEn)}</p>
        )}

        {/* The map first, then the list. StopMap renders nothing when no stop has coordinates,
            in which case the list is simply the whole page — it is the content either way. */}
        <StopMap stops={itinerary.stops} />
        <StopList stops={itinerary.stops} />

        <Link className="btn btn-primary" href="/ulaanbaatar">
          {t('Бусад хөтөлбөр харах')}
        </Link>
      </article>
    </DetailChrome>
  );
}

export function ItineraryDetail({ itinerary }: { itinerary: CityItinerary }) {
  return (
    <LangProvider
      titles={{
        mn: pageTitle(itinerary.titleMn),
        en: `${itinerary.titleEn} | AYLAYOO`,
      }}
    >
      <Body itinerary={itinerary} />
    </LangProvider>
  );
}
