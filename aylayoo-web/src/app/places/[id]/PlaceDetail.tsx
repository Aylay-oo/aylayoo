'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Place } from '../../../lib/api';
import { LangProvider, useLang } from '../../../lib/i18n';
import { photoKey, photoUrl } from '../../../lib/photos';
import { pageTitle } from '../../../lib/seo';
import { DetailChrome } from '../../components/DetailChrome';

/** The four categories the API stores, in Mongolian so they go through t() like every label. */
const CATEGORY_MN: Record<Place['category'], string> = {
  nature: 'Байгаль',
  historical: 'Түүх',
  city: 'Хот',
  cultural: 'Соёл',
};

function Body({ place }: { place: Place }) {
  const { t, pick } = useLang();
  const name = pick(place.nameMn, place.nameEn);
  const aimagName = pick(place.aimagNameMn, place.aimagNameEn);
  const months = pick(place.bestMonthsMn, place.bestMonthsEn);

  return (
    <DetailChrome
      crumbs={[
        { label: t('Нүүр'), href: '/' },
        ...(place.aimagSlug ? [{ label: aimagName, href: `/aimags/${place.aimagSlug}` }] : []),
        { label: name },
      ]}
    >
      <article className="d-card">
        <div className="d-hero">
          <Image
            src={photoUrl(photoKey(place.imageKey, place.nameMn))}
            alt={name}
            fill
            sizes="(max-width: 760px) 100vw, 720px"
            priority
            style={{ objectFit: 'cover' }}
          />
        </div>

        <h1>{name}</h1>

        {place.isMustSee && <span className="d-flag">{t('Заавал үзэх газрууд')}</span>}

        <p className="d-lede">
          {pick(place.mustSummaryMn, place.mustSummaryEn)
            || pick(place.descriptionMn, place.descriptionEn)}
        </p>

        <dl className="d-facts">
          {place.aimagSlug && (
            <>
              <dt>{t('Аймаг:')}</dt>
              <dd><Link href={`/aimags/${place.aimagSlug}`}>{aimagName}</Link></dd>
            </>
          )}
          <dt>{t('Төрөл:')}</dt>
          <dd>{t(CATEGORY_MN[place.category])}</dd>
          {months && (
            <>
              <dt>{t('Хамгийн таатай цаг:')}</dt>
              <dd>{t(months)}</dd>
            </>
          )}
        </dl>

        {/* Back to the map on the home page, where choosing a destination actually happens. */}
        <Link className="btn btn-primary" href="/#where">{t('Газрын зураг дээр харах')}</Link>
      </article>
    </DetailChrome>
  );
}

export function PlaceDetail({ place }: { place: Place }) {
  return (
    <LangProvider
      titles={{ mn: pageTitle(place.nameMn), en: `${place.nameEn} | AYLAYOO` }}
    >
      <Body place={place} />
    </LangProvider>
  );
}
