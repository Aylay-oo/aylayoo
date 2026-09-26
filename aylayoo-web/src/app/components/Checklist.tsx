'use client';

import { useMemo } from 'react';
import type { Aimag, Guide, Place } from '../../lib/api';
import { compareGuides } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { ISO_TO_SLUG, REGION, REGION_OF_API, type RegionKey } from '../../lib/static-data';
import { useTravelState } from '../../lib/travel-state';
import { GuideCard } from './GuideCard';
import { CameraIcon, CheckIcon, ChecklistCountIcon } from './icons';
import { GuideCardSkeletons, Notice } from './SectionState';

/* Tick the places you want to see; the guides who can take you there sort themselves.
 *
 * The scoring is the design's, unchanged:
 *
 *     score = (selected aimags this guide covers) × 10 + (ticked places in those aimags)
 *
 * Only guides covering at least one selected aimag appear at all, and ties break on rating
 * then review count. Weighting an aimag ten times a place means covering another province
 * always outranks covering more stops inside one — a guide who can do the whole trip beats a
 * specialist in half of it.
 */

type ChecklistProps = {
  aimags: Aimag[];
  places: Place[];
  placesLoading: boolean;
  placesError: string | null;
  reloadPlaces: () => void;
  guides: Guide[];
  guidesLoading: boolean;
  guidesError: string | null;
  reloadGuides: () => void;
};

export function Checklist({
  aimags, places, placesLoading, placesError, reloadPlaces,
  guides, guidesLoading, guidesError, reloadGuides,
}: ChecklistProps) {
  const { t, pick } = useLang();
  const { selected, isChecked, toggleChecked, checkedCount, countCheckedIn } = useTravelState();

  const byCode = useMemo(
    () => new Map(aimags.map((a) => [a.isoCode ?? '', a] as const).filter(([iso]) => iso)),
    [aimags],
  );

  const heading = useMemo(() => {
    if (selected.length === 0) return 'Очих газрууд';
    if (selected.length > 1) return `Сонгосон ${selected.length} аймагт очих газрууд`;
    const aimag = byCode.get(selected[0]);
    const name = aimag ? pick(aimag.nameMn, aimag.nameEn) : selected[0];
    // Ulaanbaatar is a city, not a province, so the design worded its heading differently.
    const region = REGION_OF_API[aimag?.region ?? ''];
    return region === 'cap' ? `${name} хотод очих газрууд` : `${name} аймагт очих газрууд`;
  }, [selected, byCode, pick]);

  /** The recommendation list: score, drop the misses, sort — then render as cards. */
  const scored = useMemo(() => {
    if (selected.length === 0) return [];
    // Selected aimags as slugs, since that is how a guide lists where it works.
    const slugOf = new Map(
      selected.map((code) => [code, byCode.get(code)?.slug ?? ISO_TO_SLUG[code]] as const),
    );

    return guides
      .map((guide) => {
        const worksIn = new Set(guide.aimags.map((a) => a.slug));
        const covered = selected.filter((code) => worksIn.has(slugOf.get(code) ?? ''));
        return {
          guide,
          hits: covered.length,
          score: covered.length * 10 + countCheckedIn(covered),
        };
      })
      .filter((row) => row.hits > 0)
      .sort(compareGuides);
  }, [guides, selected, byCode, countCheckedIn]);

  return (
    <div className="checklist" id="checklist">
      <div className="cl-top">
        <div>
          <h3>{t(heading)}</h3>
          <p>{t('Очихыг хүссэн газраа чагтлахад тохирох хөтчүүд автоматаар шүүгдэнэ.')}</p>
        </div>
        <span className="count">
          <ChecklistCountIcon />
          {t('Сонгосон:')} <b>{checkedCount}</b> {t('газар')}
        </span>
      </div>

      <div className="cl-label">
        <CameraIcon />
        {t('Заавал үзэх үзэсгэлэнт газрууд')}
      </div>

      <div>
        {placesLoading && selected.length > 0 && (
          <div className="cl-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="sk sk-card" key={i} style={{ height: 76 }} aria-hidden="true" />
            ))}
          </div>
        )}

        {!placesLoading && placesError && (
          <Notice message="Газрын зургийн мэдээлэл ачаалахад алдаа гарлаа" onRetry={reloadPlaces} />
        )}

        {!placesLoading && !placesError && (
          selected.length === 0 ? (
            <div className="empty">
              {t('Дээрх газрын зургаас аймаг сонгоход тухайн аймгийн үзэх газрууд энд гарна.')}
            </div>
          ) : (
            selected.map((code) => {
              const aimag = byCode.get(code);
              const region: RegionKey = REGION_OF_API[aimag?.region ?? ''] ?? 'center';
              const group = places.filter((place) => place.aimagId === aimag?.id);
              if (group.length === 0) return null;

              return (
                <div className="cl-group" key={code}>
                  <h5>
                    <i style={{ background: REGION[region].color }} />
                    {aimag ? pick(aimag.nameMn, aimag.nameEn) : code}
                  </h5>
                  <div className="cl-grid">
                    {group.map((place) => (
                      <label className="cl-item" key={place.id}>
                        <input
                          type="checkbox"
                          checked={isChecked(code, place.id)}
                          onChange={() => toggleChecked(code, place.id)}
                        />
                        <span className="cl-box">
                          <CheckIcon />
                        </span>
                        <div>
                          <b>{pick(place.nameMn, place.nameEn)}</b>
                          <span>{pick(place.descriptionMn, place.descriptionEn)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      <div className="rec-head">
        <div>
          <h4>{t('Санал болгох хөтөч & компаниуд')}</h4>
          <p>{t('Энэ аймаг болон таны сонгосон газруудад аялуулах боломжтой хөтчүүд')}</p>
        </div>
        <span className="found">{t(`${scored.length} хөтөч олдлоо`)}</span>
      </div>

      <div className="rec-grid">
        {guidesLoading && <GuideCardSkeletons count={3} />}

        {!guidesLoading && guidesError && (
          <Notice message="Хөтчийн мэдээлэл ачаалахад алдаа гарлаа" onRetry={reloadGuides} />
        )}

        {!guidesLoading && !guidesError && (
          scored.length > 0 ? (
            scored.map(({ guide, hits }) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                // The coverage line only makes sense with more than one aimag in play.
                coverage={selected.length > 1
                  ? `Таны сонголтоос ${hits}/${selected.length} аймагт аялуулна`
                  : undefined}
              />
            ))
          ) : (
            <div className="empty">
              {t(selected.length > 0
                ? 'Сонгосон аймгуудад одоогоор хөтөч бүртгэгдээгүй байна. Хөрш аймгийг нэмж сонгоод үзээрэй.'
                : 'Аймаг сонгоход тохирох хөтчүүд энд гарна.')}
            </div>
          )
        )}
      </div>
    </div>
  );
}
