'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useDialogs } from '../../lib/dialogs';
import { useLang, type Lang } from '../../lib/i18n';
import { useTravelState, type TravelMode } from '../../lib/travel-state';
import { LogoMark, MenuIcon, SearchIcon } from './icons';

type NavLink = {
  label: string;
  href: string;
  /** Switches the travel mode as well as jumping, as the design's [data-mode] links did. */
  mode?: TravelMode;
  /* A real page rather than a jump on this one. Every other entry here is a bare hash, which
   * is why this needs saying: a hash link is an <a> so the browser does the smooth scroll
   * itself, while a route has to be a next/link or it reloads the whole app to move one page. */
  route?: boolean;
};

const NAV_LINKS: readonly NavLink[] = [
  { label: 'Нүүр', href: '#top' },
  { label: 'Хаана', href: '#where', mode: 'country' },
  { label: 'Guide / Hutch', href: '#guides' },
  { label: 'Хотод юу хийх вэ', href: '#where', mode: 'city' },
  { label: 'Улаанбаатар', href: '/ulaanbaatar', route: true },
  { label: 'Монголын тухай', href: '#mustsee' },
  { label: 'Холбогдох', href: '#contact' },
];

export function Header() {
  const { t, lang, setLang } = useLang();
  const { setMode } = useTravelState();
  const { openRegister } = useDialogs();
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState('#top');

  function onNavClick(link: NavLink) {
    // The design closed the mobile menu and moved the underline on every nav click; the
    // jump itself is the anchor's own job, with html{scroll-behavior:smooth} doing the rest.
    setMenuOpen(false);
    setCurrent(link.href);
    if (link.mode) setMode(link.mode);
  }

  /* The hero carries no search form any more, so the magnifier goes to where choosing a
   * destination actually happens: the map, in countryside mode. */
  function jumpToSearch() {
    setMode('country');
    document.getElementById('where')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <header className="header">
      <div className="wrap">
        <a className="logo" href="#top" aria-label={t('АЯЛЪЯ ӨӨ нүүр хуудас')}>
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
        </a>

        <nav
          className={menuOpen ? 'nav open' : 'nav'}
          id="nav"
          aria-label={t('Үндсэн цэс')}
        >
          {NAV_LINKS.map((link) => {
            const props = {
              className: current === link.href ? 'on' : undefined,
              onClick: () => onNavClick(link),
            };
            return link.route ? (
              <Link key={link.label} href={link.href} {...props}>
                {t(link.label)}
              </Link>
            ) : (
              <a key={link.label} href={link.href} {...props}>
                {t(link.label)}
              </a>
            );
          })}
        </nav>

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

          <button className="icon-btn" type="button" onClick={jumpToSearch} aria-label={t('Хайлт')}>
            <SearchIcon />
          </button>

          {/* There are no traveller accounts yet, so this opens guide registration — the
              same form as the footer's "Хөтчөөр бүртгүүлэх". */}
          <button className="btn btn-ghost" type="button" onClick={openRegister}>
            {t('Нэвтрэх / Бүртгүүлэх')}
          </button>

          <button
            className="icon-btn menu-btn"
            type="button"
            aria-label={t('Цэс')}
            aria-expanded={menuOpen}
            aria-controls="nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
