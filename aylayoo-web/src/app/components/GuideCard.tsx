'use client';

import Image from 'next/image';
import Link from 'next/link';
import { imageUrl, type Guide } from '../../lib/api';
import { useDialogs } from '../../lib/dialogs';
import { useLang } from '../../lib/i18n';
import {
  avatarColor, badgeClass, experienceLabel, initials, languageLabel,
} from '../../lib/format';
import { TYPE_LABEL } from '../../lib/static-data';
import { CarIcon, ExperienceIcon, LanguageIcon, RouteIcon } from './icons';

type GuideCardProps = {
  guide: Guide;
  /** The "covers 2 of your 3 provinces" line, shown only in the recommendation list. */
  coverage?: string;
  /**
   * One of the marquee's duplicate cards. It looks identical — that is the point, it is the
   * seamless continuation of the row — but it is hidden from assistive technology and made
   * inert, so nobody tabs into the same guide twice or hears the list read out doubled.
   *
   * The attributes go on the <article> rather than a wrapper because globals.css sizes
   * `.car-track > *` directly; a wrapper would take the flex sizing and leave the card
   * inside it at its natural height, making clones visibly shorter than the originals.
   */
  clone?: boolean;
};

export function GuideCard({ guide, coverage, clone = false }: GuideCardProps) {
  const { t, pick } = useLang();
  const { openContact } = useDialogs();

  const photo = imageUrl(guide.photoUrl);
  const route = pick(guide.routeMn, guide.routeEn);
  /* The roster records a band ("4-6 жил"); a guide who registers gives a number. Prefer the
   * band, because that is what was actually recorded about them. */
  const experience = guide.experienceRange
    ?? (guide.experienceYears !== null ? experienceLabel(guide.experienceYears) : null);
  /* A driver's card shows the vehicle where a guide's shows languages — the one row that
   * differs by type in the design. */
  const isDriver = guide.type === 'driver';

  return (
    <article className="g-card" aria-hidden={clone || undefined} inert={clone || undefined}>
      <div className="g-top">
        {photo ? (
          <Image
            className="g-av"
            src={photo}
            alt={guide.name}
            width={50}
            height={50}
            style={{ objectFit: 'cover' }}
            // Uploaded photos come from the API's own domain, which is not configured for
            // next/image optimisation, so they are served as-is.
            unoptimized
          />
        ) : (
          <div className="g-av" style={{ background: avatarColor(guide.name) }} aria-hidden="true">
            {initials(guide.name)}
          </div>
        )}
        <div>
          {/* A marquee clone carries aria-hidden and inert on the <article>, so the duplicate of
              this link is already out of the tab order. */}
          <b><Link href={`/guides/${guide.id}`}>{guide.name}</Link></b>
          <span className={`badge ${badgeClass(guide.type)}`}>{t(TYPE_LABEL[guide.type])}</span>
        </div>
      </div>

      {coverage && <span className="cover">{t(coverage)}</span>}

      <ul className="g-rows">
        {isDriver ? (
          guide.car && (
            <li>
              <CarIcon />
              <span>
                <b>{t('Машин:')}</b> {guide.car}
              </span>
            </li>
          )
        ) : (
          guide.languages.length > 0 && (
            <li>
              <LanguageIcon />
              <span>
                {/* Label and value are translated separately, because the dictionary keys
                    the labels with their colon. */}
                <b>{t('Хэл:')}</b> {t(languageLabel(guide.languages))}
              </span>
            </li>
          )
        )}

        {/* A band from the association's roster, or a number from a self-registration.
            Neither present means the row is left out rather than shown empty. */}
        {experience && (
          <li>
            <ExperienceIcon />
            <span>
              <b>{t('Туршлага:')}</b> {t(experience)}
            </span>
          </li>
        )}

        {route && (
          <li>
            <RouteIcon />
            <span>
              <b>{t('Чиглэл:')}</b> {t(route)}
            </span>
          </li>
        )}
      </ul>

      <div className="g-foot">
        {/* No rating yet means no stars at all, rather than a zero or an invented number.
            The empty span keeps the button on the right, where space-between puts it. */}
        {guide.rating !== null ? (
          <span className="rt">
            <span className="star">★</span> {guide.rating.toFixed(1)}{' '}
            {guide.reviewCount !== null && <span>({guide.reviewCount})</span>}
          </span>
        ) : (
          <span className="rt" />
        )}
        <button
          className="btn btn-soft"
          type="button"
          style={{ padding: '7px 14px', fontSize: 13 }}
          onClick={() => openContact({ kind: 'contact', subject: guide.name, guideId: guide.id })}
        >
          {t('Холбогдох')}
        </button>
      </div>
    </article>
  );
}
