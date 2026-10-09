'use client';

import { useLang } from '../../lib/i18n';
import { HeroHeadline } from './HeroHeadline';
import { HeroSlides } from './HeroSlides';
import { HeroWave } from './icons';

export function Hero() {
  const { t } = useLang();

  return (
    <section className="hero" aria-label={t('Нүүр')}>
      <HeroSlides />
      <div className="wrap">
        <HeroHeadline />
        <p>
          {t(
            'Монголд аялах гэж буй дотоод болон гадаадын жуулчдад аяллын чиглэл, үзэсгэлэнт газрууд, хөтөч болон аяллын компаниудын мэдээллийг нэг дороос олж, аяллаа төлөвлөхөд туслах веб платформ.',
          )}
        </p>
      </div>
      <HeroWave />
    </section>
  );
}
