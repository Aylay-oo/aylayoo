/* Presentation details the design derived from hard-coded fields that the API does not have.
 *
 * The mockup's guide objects carried their own initials (`ini`) and avatar colour (`col`),
 * because they were written by hand. Real guides register themselves, so both are derived
 * from the name here — deterministically, so a guide's avatar never changes colour between
 * renders or between visitors.
 */

import type { Guide, GuideType } from './api';

/** The ten avatar colours the design used, in its own order. */
const AVATAR_COLORS = [
  '#6C7AE0', '#2E7DAF', '#9B5DE5', '#C9861A', '#3B82F6',
  '#EA580C', '#10A37F', '#7C3AED', '#D9485F', '#0E9F9A',
] as const;

/**
 * Up to two initials, the way the design wrote them: the first letter of the first two
 * words, so "Б. Болормаа" → "ББ" and "Blue Pearl Tours" → "BP".
 */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    // "Б." contributes its letter, not its dot.
    .map((word) => [...word.replace(/[^\p{L}\p{N}]/gu, '')][0])
    .filter(Boolean);
  return letters.slice(0, 2).join('').toUpperCase();
}

/** A stable colour for a name — same string in, same colour out. */
export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* The badge classes in globals.css are .guide / .driver / .company, but the API calls a
 * private guide `individual`. */
const BADGE_CLASS: Record<GuideType, string> = {
  individual: 'guide',
  driver: 'driver',
  company: 'company',
};

export const badgeClass = (type: GuideType): string => BADGE_CLASS[type] ?? 'guide';

/** ISO-ish language codes as the design spelled the languages out. */
const LANGUAGE_NAMES: Record<string, string> = {
  mn: 'Монгол',
  en: 'Англи',
  ru: 'Орос',
  zh: 'Хятад',
  ja: 'Япон',
  ko: 'Солонгос',
  fr: 'Франц',
  de: 'Герман',
  es: 'Испани',
  it: 'Итали',
};

/**
 * "Англи, Солонгос" from ["en","ko"]. Translating the result gives
 * "English, Korean", because the design's comma-list rule translates each element.
 * An unknown code is shown uppercased rather than dropped, so a guide who registers with
 * one still lists it.
 */
export function languageLabel(codes: readonly string[]): string {
  return codes.map((code) => LANGUAGE_NAMES[code] ?? code.toUpperCase()).join(', ');
}

/** The Mongolian names, for the registration form's language picker. */
export const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }));

/** "6 жил" — the design's phrasing, which the translator turns into "6 years". */
export const experienceLabel = (years: number): string => `${years} жил`;

/**
 * Sorts guides for the recommendation list, mirroring the design's comparator: score first,
 * then rating, then review count. A guide with no rating yet sorts below a rated one at the
 * same score rather than above it, which treating null as 0 gets right.
 */
export function compareGuides(
  a: { score: number; guide: Guide },
  b: { score: number; guide: Guide },
): number {
  return (
    b.score - a.score
    || (b.guide.rating ?? 0) - (a.guide.rating ?? 0)
    || (b.guide.reviewCount ?? 0) - (a.guide.reviewCount ?? 0)
  );
}
