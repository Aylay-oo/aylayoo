'use client';

import { useMemo, useState } from 'react';
import type { Aimag } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { SLUG_TO_ISO } from '../../lib/static-data';
import { useTravelState, type GuideFilter } from '../../lib/travel-state';
import { HeroSlides } from './HeroSlides';
import { CalendarIcon, GuideSearchIcon, HeroWave, PinIcon, SearchIconBold } from './icons';
import { WHERE_FIELD_ID } from './Header';

/** Ulaanbaatar is the one "where" that means city mode rather than a map selection. */
const UB_SLUG = 'ulaanbaatar';

type HeroProps = {
  aimags: Aimag[];
  /** While the aimags load the select stays usable — it just has only its placeholder. */
  aimagsLoading: boolean;
};

export function Hero({ aimags, aimagsLoading }: HeroProps) {
  const { t, lang, pick } = useLang();
  const { setMode, selectAimag, setGuideFilter } = useTravelState();
  const [where, setWhere] = useState('');
  const [who, setWho] = useState<GuideFilter>('all');

  /* The design sorted its aimags by Mongolian collation; sort by whichever name is on
   * screen, so the list reads alphabetically in both languages. */
  const sorted = useMemo(
    () => [...aimags].sort((a, b) => pick(a.nameMn, a.nameEn)
      .localeCompare(pick(b.nameMn, b.nameEn), lang === 'en' ? 'en' : 'mn')),
    [aimags, lang, pick],
  );

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (where) {
      // A place wins over the guide filter, exactly as in the design: pick Ulaanbaatar and
      // you get city mode, pick anywhere else and the map selects it.
      if (where === UB_SLUG) {
        setMode('city');
      } else {
        setMode('country');
        const iso = SLUG_TO_ISO[where];
        if (iso) selectAimag(iso);
      }
      document.getElementById('where')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // No destination: treat it as a search for people, and jump to the guides carousel with
    // the filter applied.
    setGuideFilter(who);
    document.getElementById('guides')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="hero" aria-label={t('Нүүр')}>
      <HeroSlides />
      <div className="wrap">
        <h1>{t('Аялая өө, уулзъя өө, амрая өө')}</h1>
        <p>
          {t(
            'Монголд аялах гэж буй дотоод болон гадаадын жуулчдад аяллын чиглэл, үзэсгэлэнт газрууд, хөтөч болон аяллын компаниудын мэдээллийг нэг дороос олж, аяллаа төлөвлөхөд туслах веб платформ.',
          )}
        </p>

        <form className="search" role="search" onSubmit={onSubmit}>
          <div className="s-field">
            <PinIcon />
            <div style={{ minWidth: 0, flex: 1 }}>
              <label htmlFor={WHERE_FIELD_ID}>{t('Хаана')}</label>
              <select
                id={WHERE_FIELD_ID}
                value={where}
                onChange={(e) => setWhere(e.target.value)}
              >
                <option value="">
                  {aimagsLoading
                    ? t('Ачаалж байна…')
                    : t('Жишээ нь: Хөвсгөл, Говь, Өвөрхангай')}
                </option>
                {sorted.map((aimag) => (
                  <option key={aimag.slug} value={aimag.slug}>
                    {pick(aimag.nameMn, aimag.nameEn)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="s-field">
            <CalendarIcon />
            <div style={{ minWidth: 0, flex: 1 }}>
              {/* Kept from the design, but there is nothing to search on yet: the API has no
                  date or season field, so this deliberately does not affect the results. */}
              <label htmlFor="sWhen">{t('Хэзээ')}</label>
              <input id="sWhen" type="month" aria-label={t('Огноо сонгох')} />
            </div>
          </div>

          <div className="s-field">
            <GuideSearchIcon />
            <div style={{ minWidth: 0, flex: 1 }}>
              <label htmlFor="sWho">Guide / Hutch</label>
              <select
                id="sWho"
                value={who}
                onChange={(e) => setWho(e.target.value as GuideFilter)}
              >
                <option value="all">{t('Хөтөч эсвэл аяллын компани')}</option>
                <option value="guide">{t('Хувь хөтөч')}</option>
                <option value="company">{t('Аяллын компани')}</option>
                <option value="driver">{t('Жолооч')}</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" type="submit">
            <SearchIconBold />
            {t('Хайх')}
          </button>
        </form>
      </div>
      <HeroWave />
    </section>
  );
}
