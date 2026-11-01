'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { AimagWithPlaces, Guide } from '../../../lib/api';
import { TYPE_LABEL } from '../../../lib/static-data';
import { LangProvider, useLang } from '../../../lib/i18n';
import { photoKey, photoUrl } from '../../../lib/photos';
import { pageTitle } from '../../../lib/seo';
import { DetailChrome } from '../../components/DetailChrome';

function Body({ aimag, guides }: { aimag: AimagWithPlaces; guides: Guide[] }) {
  const { t, pick } = useLang();
  const name = pick(aimag.nameMn, aimag.nameEn);

  return (
    <DetailChrome
      crumbs={[
        { label: t('Нүүр'), href: '/' },
        { label: t('Аймгууд'), href: '/#where' },
        { label: name },
      ]}
    >
      <article className="d-card">
        <h1>{name}</h1>

        <dl className="d-facts">
          {aimag.centerMn && (
            <>
              <dt>{t('Төв:')}</dt>
              <dd>{pick(aimag.centerMn, aimag.centerEn)}</dd>
            </>
          )}
          {aimag.areaKm2 !== null && (
            <>
              <dt>{t('Талбай:')}</dt>
              {/* "116.0 мянган км²" translates whole, via its own rule in i18n.tsx. */}
              <dd>{t(`${aimag.areaKm2.toFixed(1)} мянган км²`)}</dd>
            </>
          )}
        </dl>

        <h2>{t('Аялж болох газрууд')}</h2>
        {aimag.places.length > 0 ? (
          <ul className="d-places">
            {aimag.places.map((place) => (
              <li key={place.id}>
                <Link href={`/places/${place.id}`}>
                  <span className="thumb">
                    <Image
                      src={photoUrl(photoKey(place.imageKey, place.nameMn))}
                      alt=""
                      width={52}
                      height={52}
                      sizes="52px"
                    />
                  </span>
                  <span>
                    <b>{pick(place.nameMn, place.nameEn)}</b>
                    <span>{pick(place.descriptionMn, place.descriptionEn)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{t('Энэ аймагт бүртгэлтэй газар одоохондоо алга.')}</p>
        )}

        <h2>{t('Энд ажилладаг хөтөч, компаниуд')}</h2>
        {guides.length > 0 ? (
          <ul className="d-guides">
            {guides.map((guide) => (
              <li key={guide.id}>
                <Link href={`/guides/${guide.id}`}>
                  <b>{guide.name}</b>
                  <span>{t(TYPE_LABEL[guide.type])}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{t('Энэ аймагт бүртгэлтэй хөтөч одоохондоо алга.')}</p>
        )}
      </article>
    </DetailChrome>
  );
}

export function AimagDetail({ aimag, guides }: { aimag: AimagWithPlaces; guides: Guide[] }) {
  return (
    <LangProvider titles={{ mn: pageTitle(aimag.nameMn), en: `${aimag.nameEn} | AYLAYOO` }}>
      <Body aimag={aimag} guides={guides} />
    </LangProvider>
  );
}
