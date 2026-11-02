'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { I18N_EN } from './i18n-dictionary';
import { I18N_EXTRA } from './i18n-extra';
import { HOME_TITLES, type PageTitles } from './seo';

export type Lang = 'mn' | 'en';

/* The design's dictionary, plus the strings it never needed because it had no backend.
 * I18N_EN wins on the few keys both define, so the mockup's wording always stands. */
const DICTIONARY: Readonly<Record<string, string>> = { ...I18N_EXTRA, ...I18N_EN };

/** The design's localStorage key, so a visitor's existing choice still applies. */
const STORAGE_KEY = 'aylayoo-lang';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CYRILLIC = /[А-Яа-яЁёӨөҮү]/;

/**
 * Mongolian → English, exactly as the design's `T()` did it.
 *
 * The dictionary cannot hold strings that are built while the page runs — "3 хөтөч олдлоо",
 * "6–8 сар", "≈54 км" — so those go through the patterns below, in this order. Anything
 * still unmatched comes back unchanged, which is also how the mockup behaved.
 *
 * Why this is a function rather than the mockup's DOM rewriting: the design translated the
 * page by walking every text node with a TreeWalker and a MutationObserver, which fights
 * React for ownership of the DOM. Same dictionary, same patterns, same output — but the
 * strings are translated before they are rendered.
 *
 * One consequence of that origin decides how callers must use it. The mockup translated one
 * text node at a time, so a card's label and its value were two separate lookups, and the
 * dictionary holds the labels WITH their colon:
 *
 *     t('Хэл:') + ' ' + t('Англи, Солонгос')   →  'Languages: English, Korean'   ✓
 *     t('Хэл: Англи, Солонгос')                →  'Хэл: English, Korean'         ✗
 *
 * while the trip duration was a single node and only translates whole:
 *
 *     t('Хугацаа: 1 цаг')                      →  'Duration: 1 h'                ✓
 *     t('Хугацаа:') + ' ' + t('1 цаг')         →  'Хугацаа: 1 цаг'               ✗
 *
 * So translate a string at the same granularity the design rendered it. i18n.spec.ts pins
 * both shapes.
 */
export function translate(s: string): string {
  const exact = DICTIONARY[s];
  if (exact !== undefined) return exact;

  let m: RegExpMatchArray | null;
  if ((m = s.match(/^Сонгосон (\d+) аймагт очих газрууд$/)))
    return `Places to visit in ${m[1]} selected provinces`;
  if ((m = s.match(/^(.+) аймагт очих газрууд$/))) return `Places to visit in ${translate(m[1])}`;
  if ((m = s.match(/^(.+) хотод очих газрууд$/))) return `Places to visit in ${translate(m[1])}`;
  if ((m = s.match(/^(\d+) хөтөч олдлоо$/)))
    return `${m[1]} ${m[1] === '1' ? 'guide' : 'guides'} found`;
  if ((m = s.match(/^([\d.]+) мянган км²$/))) return `${m[1]} thousand km²`;
  if ((m = s.match(/^(\d+) жил$/))) return `${m[1]} years`;
  if ((m = s.match(/^(\d+) км зайд$/))) return `Within ${m[1]} km`;
  // The city section's counts: "4 зогсоол", "2 өдөр", "3/4 зогсоол зураг дээр".
  if ((m = s.match(/^(\d+) зогсоол$/))) return `${m[1]} ${m[1] === '1' ? 'stop' : 'stops'}`;
  if ((m = s.match(/^(\d+) өдөр$/))) return `${m[1]} ${m[1] === '1' ? 'day' : 'days'}`;
  if ((m = s.match(/^(\d+)\/(\d+) зогсоол зураг дээр$/)))
    return `${m[1]} of ${m[2]} stops on the map`;
  if ((m = s.match(/^≈(\d+) км$/))) return `≈${m[1]} km`;
  if ((m = s.match(/^([\d.]+) · (\d+) үнэлгээ$/))) return `${m[1]} · ${m[2]} reviews`;
  if ((m = s.match(/^(\d+)–(\d+) сар$/))) return `${MONTHS[+m[1]]}–${MONTHS[+m[2]]}`;
  if ((m = s.match(/^Хугацаа: (.+) цаг$/))) return `Duration: ${m[1]} h`;
  // The nearest trips are measured in minutes, and the furthest in days.
  if ((m = s.match(/^Хугацаа: (.+) мин$/))) return `Duration: ${m[1]} min`;
  if ((m = s.match(/^Хугацаа: (.+) өдөр$/))) return `Duration: ${m[1]} days`;
  if ((m = s.match(/^Сонгосон аймгууд \((\d+)\)$/))) return `Selected provinces (${m[1]})`;
  if ((m = s.match(/^Таны сонголтоос (\d+)\/(\d+) аймагт аялуулна$/)))
    return `Covers ${m[1]} of your ${m[2]} provinces`;
  if ((m = s.match(/^(.+) хасах$/))) return `Remove ${translate(m[1])}`;
  if ((m = s.match(/^(.+)-тай холбогдох$/))) return `Contact ${translate(m[1])}`;
  if ((m = s.match(/^(.+) — захиалга$/))) return `Book: ${translate(m[1])}`;
  if ((m = s.match(/^([^:]+): (.+)$/))) return `${translate(m[1])}: ${translate(m[2])}`;
  if (s.includes(', ')) {
    const parts = s.split(', ').map((p) => translate(p.trim()));
    // Only join when every part actually translated; a half-English list reads worse than
    // leaving the original alone.
    if (parts.every((p) => !CYRILLIC.test(p))) return parts.join(', ');
  }
  return s;
}

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** A Mongolian UI string, translated when the page is in English. */
  t: (mn: string) => string;
  /** Picks the right column of an API row, falling back to Mongolian. */
  pick: (mn: string | null | undefined, en: string | null | undefined) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

/* `titles` exists because the effect below owns document.title outright. Before the detail
 * pages that was harmless — there was one page, so one hard-coded pair would do — but on
 * /places/42 it would overwrite the title the server rendered with the home page's, the moment
 * the visitor touched the language switch. A page passes its own pair instead. */
export function LangProvider(
  { children, titles = HOME_TITLES }: { children: ReactNode; titles?: PageTitles },
) {
  // Always start in Mongolian so the server's HTML and the first client render agree; the
  // stored choice is applied in the effect below, after hydration.
  const [lang, setLangState] = useState<Lang>('mn');

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Safari in private mode throws on localStorage; the page just stays in Mongolian.
    }
    if (saved === 'en') setLangState('en');
  }, []);

  useEffect(() => {
    // globals.css keys off this: `html[lang="en"] .hero h1` drops the uppercase treatment.
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? titles.en : titles.mn;
    // The two strings, not the object: a caller that builds `titles` inline would otherwise
    // hand us a new identity on every render and re-run this forever.
  }, [lang, titles.mn, titles.en]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice is not worth breaking the switch over.
    }
  }, []);

  const value = useMemo<LangContextValue>(() => ({
    lang,
    setLang,
    t: (mn: string) => (lang === 'en' ? translate(mn) : mn),
    pick: (mn, en) => (lang === 'en' ? en || mn || '' : mn || en || ''),
  }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
