'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CityTour } from '../../../../lib/api';
import { LangProvider, useLang } from '../../../../lib/i18n';
import { pageTitle } from '../../../../lib/seo';
import { DetailChrome } from '../../../components/DetailChrome';
import { StopList } from '../../../components/StopList';
import { StopMap } from '../../../components/StopMap';
import { TripRequestDialog } from '../../../components/TripRequestDialog';
import { durationMn } from '../../Tours';

function Body({ tour }: { tour: CityTour }) {
  const { t, pick } = useLang();
  const [asking, setAsking] = useState(false);
  const title = pick(tour.titleMn, tour.titleEn);
  const meetingPoint = pick(tour.meetingPointMn, tour.meetingPointEn);

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
        {tour.durationMinutes != null && (
          <span className="d-flag">{t(durationMn(tour.durationMinutes))}</span>
        )}

        {(tour.summaryMn || tour.summaryEn) && (
          <p className="d-lede">{pick(tour.summaryMn, tour.summaryEn)}</p>
        )}

        {/* Whose tour this is, before the itinerary.
         *
         * The guide's name links to their page and nothing else: no phone number, no email
         * address, no legal name. The API does not return them for a tour's guide and this
         * page would not render them if it did — incident 2 in docs/incidents.md is what a
         * guide's contact details reaching a public page costs. A traveller reaches this
         * guide through the request form below, which is the whole point of the form. */}
        <section className="tour-lead">
          <h2>{t('Хөтөч')}</h2>
          <p>
            <Link href={`/guides/${tour.guide.id}`}>{tour.guide.name}</Link>
            {tour.guide.rating != null && (
              <span className="rt">
                <span className="star">★</span> {tour.guide.rating.toFixed(1)}
                {tour.guide.reviewCount != null && <span> ({tour.guide.reviewCount})</span>}
              </span>
            )}
          </p>
          {tour.guide.languages.length > 0 && (
            <p>
              {t('Хэл:')} {t(tour.guide.languages.join(', '))}
            </p>
          )}
          {meetingPoint && (
            <p>
              {t('Уулзах газар:')} {meetingPoint}
            </p>
          )}
        </section>

        <StopMap stops={tour.stops} />
        <StopList stops={tour.stops} />

        <div className="d-actions">
          <button className="btn btn-primary" type="button" onClick={() => setAsking(true)}>
            {t('Хүсэлт илгээх')}
          </button>
          <Link className="btn btn-soft" href="/ulaanbaatar">
            {t('Бусад аялал харах')}
          </Link>
        </div>

        <TripRequestDialog
          open={asking}
          onClose={() => setAsking(false)}
          tourId={tour.id}
          tourTitle={title}
        />
      </article>
    </DetailChrome>
  );
}

export function TourDetail({ tour }: { tour: CityTour }) {
  return (
    <LangProvider
      titles={{ mn: pageTitle(tour.titleMn), en: `${tour.titleEn} | AYLAYOO` }}
    >
      <Body tour={tour} />
    </LangProvider>
  );
}
