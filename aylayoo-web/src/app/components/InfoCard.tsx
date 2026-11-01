'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Aimag, Guide, Place } from '../../lib/api';
import { avatarColor, initials } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { photoKey, photoUrl } from '../../lib/photos';
import { ISO_TO_SLUG, REGION, REGION_OF_API, TYPE_LABEL, type RegionKey } from '../../lib/static-data';
import { useTravelState } from '../../lib/travel-state';
import { Notice, PlaceRowSkeletons } from './SectionState';

/* The panel beside the map: which aimags are selected, then everything about the focused
 * one — its region, centre, area, the places worth visiting and who works there.
 *
 * All of it is API data. The only static parts are the region's colour and label.
 */

type InfoCardProps = {
  aimags: Aimag[];
  places: Place[];
  placesLoading: boolean;
  placesError: string | null;
  reloadPlaces: () => void;
  guides: Guide[];
};

export function InfoCard({
  aimags, places, placesLoading, placesError, reloadPlaces, guides,
}: InfoCardProps) {
  const { t, pick } = useLang();
  const { selected, activeCode, focusAimag, removeAimag, clearAimags } = useTravelState();

  const byCode = new Map(
    aimags.map((aimag) => [aimag.isoCode ?? '', aimag] as const).filter(([iso]) => iso),
  );
  const nameOf = (code: string) => {
    const aimag = byCode.get(code);
    return aimag ? pick(aimag.nameMn, aimag.nameEn) : code;
  };

  /* The chip bar sits above everything and stays even when nothing is selected, so the
   * "clear all" affordance and the count never disappear mid-interaction. */
  const chipBar = (
    <div className="sel-bar">
      <div className="lbl">
        <span>{t(`Сонгосон аймгууд (${selected.length})`)}</span>
        {selected.length > 0 && (
          <button type="button" onClick={clearAimags}>
            {t('Бүгдийг арилгах')}
          </button>
        )}
      </div>
      {selected.map((code) => (
        <span className={code === activeCode ? 'a-chip active' : 'a-chip'} key={code}>
          <button className="a-chip-name" type="button" onClick={() => focusAimag(code)}>
            {nameOf(code)}
          </button>
          <button
            className="x"
            type="button"
            style={{ border: 0, cursor: 'pointer', color: 'inherit' }}
            onClick={() => removeAimag(code)}
            aria-label={t(`${nameOf(code)} хасах`)}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );

  if (!activeCode) {
    return (
      <aside className="info-card" id="info" aria-live="polite">
        {chipBar}
        <div className="empty">{t('Газрын зураг дээрээс очих аймгуудаа дарж сонгоно уу.')}</div>
      </aside>
    );
  }

  const aimag = byCode.get(activeCode);
  const slug = aimag?.slug ?? ISO_TO_SLUG[activeCode];
  const region: RegionKey = REGION_OF_API[aimag?.region ?? ''] ?? 'center';
  const aimagPlaces = places.filter((place) => place.aimagId === aimag?.id);
  const here = guides.filter((guide) => guide.aimags.some((a) => a.slug === slug));

  return (
    <aside className="info-card" id="info" aria-live="polite">
      {chipBar}

      <span className="chip">
        <i style={{ background: REGION[region].color }} />
        {t(REGION[region].name)}
      </span>
      <h3>{aimag ? pick(aimag.nameMn, aimag.nameEn) : activeCode}</h3>

      <div className="meta">
        {aimag?.centerMn && (
          <span>
            {t('Төв:')} <b>{t(pick(aimag.centerMn, aimag.centerEn))}</b>
          </span>
        )}
        {aimag?.areaKm2 != null && (
          <span>
            {/* "116.0 мянган км²" translates whole, via its own rule. */}
            {t('Талбай:')} <b>{t(`${aimag.areaKm2.toFixed(1)} мянган км²`)}</b>
          </span>
        )}
      </div>

      {/* The aimag's own page, where the same places read as full entries with their own URLs. */}
      {slug && (
        <Link className="info-page" href={`/aimags/${slug}`}>{t('Аймгийн хуудас')}</Link>
      )}

      <div className="info-sub">{t('Аялж болох газрууд')}</div>
      {placesLoading && <PlaceRowSkeletons />}
      {!placesLoading && placesError && (
        <Notice message="Газрын зургийн мэдээлэл ачаалахад алдаа гарлаа" onRetry={reloadPlaces} />
      )}
      {!placesLoading && !placesError && (
        aimagPlaces.length > 0 ? (
          <ul className="places">
            {aimagPlaces.map((place) => {
              const name = pick(place.nameMn, place.nameEn);
              return (
                <li key={place.id}>
                  <span className="thumb">
                    <Image
                      src={photoUrl(photoKey(place.imageKey, place.nameMn))}
                      alt=""
                      width={52}
                      height={52}
                      sizes="52px"
                    />
                  </span>
                  <div>
                    <b><Link href={`/places/${place.id}`}>{name}</Link></b>
                    <span>{pick(place.descriptionMn, place.descriptionEn)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty" style={{ padding: 14 }}>
            {t('Энэ аймагт бүртгэлтэй газар одоохондоо алга.')}
          </div>
        )
      )}

      <div className="info-sub">{t('Энд ажилладаг хөтөч, компаниуд')}</div>
      {here.length > 0 ? (
        // Two at most, as in the design; the full list is the recommendation grid below.
        here.slice(0, 2).map((guide) => (
          <div className="mini-guide" key={guide.id}>
            <span className="av" style={{ background: avatarColor(guide.name) }} aria-hidden="true">
              {initials(guide.name)}
            </span>
            <div>
              <b>{guide.name}</b>
              <small>{t(TYPE_LABEL[guide.type])}</small>
            </div>
            {guide.rating !== null && (
              <span className="rate">
                <span className="star">★</span> {guide.rating.toFixed(1)}
              </span>
            )}
          </div>
        ))
      ) : (
        <div className="empty" style={{ padding: 14 }}>
          {t('Энэ аймагт бүртгэлтэй хөтөч одоохондоо алга.')}
        </div>
      )}

      <button
        className="btn btn-primary"
        type="button"
        onClick={() => document.getElementById('checklist')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      >
        {t('Очих газраа сонгох')}
      </button>
    </aside>
  );
}
