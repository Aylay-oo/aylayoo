'use client';

import Image from 'next/image';
import Link from 'next/link';
import { imageUrl } from '../../../lib/api';
import { DialogsProvider, useDialogs } from '../../../lib/dialogs';
import type { GuideView } from './guide-view';
import {
  avatarColor, badgeClass, experienceLabel, initials, languageLabel, safeHttpUrl,
} from '../../../lib/format';
import { LangProvider, useLang } from '../../../lib/i18n';
import { pageTitle } from '../../../lib/seo';
import { TYPE_LABEL } from '../../../lib/static-data';
import { ContactDialog } from '../../components/ContactDialog';
import { DetailChrome } from '../../components/DetailChrome';
import { Toast } from '../../components/Toast';

function Body({ guide }: { guide: GuideView }) {
  const { t, pick } = useLang();
  const { openContact } = useDialogs();
  const photo = imageUrl(guide.photoUrl);
  const bio = pick(guide.bioMn, guide.bioEn);
  const route = pick(guide.routeMn, guide.routeEn);
  // Never straight into an href — see safeHttpUrl.
  const website = safeHttpUrl(guide.website);

  /* The roster records a band ("4-6 жил"); someone who registers gives a number. Same precedence
   * as GuideCard: whichever one the row actually has. */
  const experience = guide.experienceRange
    ?? (guide.experienceYears !== null ? experienceLabel(guide.experienceYears) : null);

  return (
    <DetailChrome
      crumbs={[
        { label: t('Нүүр'), href: '/' },
        { label: t('Хөтөч'), href: '/#guides' },
        { label: guide.name },
      ]}
    >
      <article className="d-card">
        <div className="d-top">
          {photo ? (
            <Image
              className="g-av"
              src={photo}
              alt={guide.name}
              width={72}
              height={72}
              style={{ objectFit: 'cover' }}
              // The API's own domain is not configured for next/image optimisation.
              unoptimized
            />
          ) : (
            <div className="g-av" style={{ background: avatarColor(guide.name) }} aria-hidden="true">
              {initials(guide.name)}
            </div>
          )}
          <div>
            <h1>{guide.name}</h1>
            <span className={`badge ${badgeClass(guide.type)}`}>{t(TYPE_LABEL[guide.type])}</span>
          </div>
        </div>

        {bio && <p className="d-lede">{bio}</p>}

        <dl className="d-facts">
          {guide.languages.length > 0 && (
            <>
              <dt>{t('Хэл:')}</dt>
              <dd>{t(languageLabel(guide.languages))}</dd>
            </>
          )}
          {experience && (
            <>
              <dt>{t('Туршлага:')}</dt>
              <dd>{t(experience)}</dd>
            </>
          )}
          {route && (
            <>
              <dt>{t('Чиглэл:')}</dt>
              <dd>{t(route)}</dd>
            </>
          )}
          {guide.car && (
            <>
              <dt>{t('Машин:')}</dt>
              <dd>{guide.car}</dd>
            </>
          )}
          {website && (
            <>
              <dt>{t('Вэб сайт')}</dt>
              <dd>
                <a href={website} target="_blank" rel="noreferrer noopener">{website}</a>
              </dd>
            </>
          )}
        </dl>

        {guide.aimags.length > 0 && (
          <>
            <h2>{t('Ажилладаг аймгууд')}</h2>
            <ul className="d-chips">
              {guide.aimags.map((aimag) => (
                <li key={aimag.id}>
                  <Link href={`/aimags/${aimag.slug}`}>{pick(aimag.nameMn, aimag.nameEn)}</Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Phone and email never reach this component — see GuideView above. */}
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => openContact({ kind: 'contact', subject: guide.name, guideId: guide.id })}
        >
          {t('Холбогдох')}
        </button>
      </article>
    </DetailChrome>
  );
}

export function GuideDetail({ guide }: { guide: GuideView }) {
  return (
    <LangProvider titles={{ mn: pageTitle(guide.name), en: `${guide.name} | AYLAYOO` }}>
      <DialogsProvider>
        <Body guide={guide} />
        <ContactDialog />
        <Toast />
      </DialogsProvider>
    </LangProvider>
  );
}
