'use client';

import Link from 'next/link';
import { useLang, type Lang } from '../../lib/i18n';
import { LogoMark } from './icons';

/* The frame around a detail page: the logo, the language switch, a breadcrumb, and a slim footer.
 *
 * Deliberately not the home page's <Header />. Every link in that nav is a bare hash — "#where",
 * "#guides" — which resolves to nothing on /places/42, and each one also drives travel state
 * (the map's selection, the city/countryside mode) that only the home page owns. Reusing it would
 * mean either broken links or threading that state through pages which have no map to apply it
 * to. A detail page needs two things from the chrome: a way back, and the language switch.
 */

export type Crumb = { label: string; href?: string };

export function DetailChrome(
  { crumbs, children }: { crumbs: readonly Crumb[]; children: React.ReactNode },
) {
  const { t, lang, setLang } = useLang();

  return (
    <>
      <header className="header">
        <div className="wrap">
          <Link className="logo" href="/" aria-label={t('АЯЛЪЯ ӨӨ нүүр хуудас')}>
            <LogoMark />
            <span>
              <span className="logo-word">
                AYLAY
                <span className="logo-o">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <small>{t('Аялъя өө, Уулзъя өө, Амаръя өө')}</small>
            </span>
          </Link>

          <div className="h-tools">
            <label className="sr" htmlFor="lang">{t('Хэл сонгох')}</label>
            <select
              className="lang"
              id="lang"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="mn">🇲🇳 MN</option>
              <option value="en">🇬🇧 EN</option>
            </select>
          </div>
        </div>
      </header>

      <main id="top" className="detail">
        <div className="wrap">
          {/* An <ol>, because the order is the meaning: each crumb contains the next. */}
          <nav className="crumbs" aria-label={t('Хуудасны зам')}>
            <ol>
              {crumbs.map((crumb) => (
                <li key={`${crumb.label}-${crumb.href ?? 'current'}`}>
                  {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
                </li>
              ))}
            </ol>
          </nav>

          {children}
        </div>
      </main>

      <footer className="detail-foot">
        <div className="wrap">
          <Link href="/">{t('Нүүр хуудас руу буцах')}</Link>
          <span>© 2026 aylayoo</span>
        </div>
      </footer>
    </>
  );
}
