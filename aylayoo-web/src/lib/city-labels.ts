/* The city section's own labels and date formatting.
 *
 * Why the labels live in records here rather than inline in the components: the API stores a
 * stop's time of day, a tip's topic, a phrase's category and a price level as short enum
 * strings, and every one of them needs a Mongolian heading that also reads in English. Keeping
 * them in one place means the heading for `transport` cannot differ between the public page and
 * the admin editor.
 *
 * These reach t() as `t(TIP_TOPIC_MN[tip.topic])` — a variable, not a literal — so
 * i18n-coverage.spec.ts cannot see them. city-labels.spec.ts checks them instead, the same way
 * trips.spec.ts covers the trip table.
 */

import type {
  ItineraryDays, PhraseCategory, PriceLevel, TimeOfDay, TipTopic,
} from './api';
import type { Lang } from './i18n';

/** In the order a day runs, which is the order an itinerary's stops are grouped under. */
export const TIMES_OF_DAY: readonly TimeOfDay[] = ['morning', 'midday', 'afternoon', 'evening'];

export const TIME_OF_DAY_MN: Record<TimeOfDay, string> = {
  morning: 'Өглөө',
  midday: 'Өдөр',
  afternoon: 'Үдээс хойш',
  evening: 'Орой',
};

/** The practical guide's four sections, in the order the brief lists them. */
export const TIP_TOPICS: readonly TipTopic[] = ['transport', 'money', 'weather', 'etiquette'];

export const TIP_TOPIC_MN: Record<TipTopic, string> = {
  transport: 'Хотоор зорчих',
  money: 'Сим карт ба төлбөр',
  weather: 'Цаг агаар ба хувцас',
  etiquette: 'Зан заншил',
};

/* The phrasebook's sections, easiest first: somebody opening this on arrival wants a greeting
 * and "thank you" before they want to count. */
export const PHRASE_CATEGORIES: readonly PhraseCategory[] = [
  'greetings', 'basics', 'food', 'directions', 'numbers', 'emergency',
];

export const PHRASE_CATEGORY_MN: Record<PhraseCategory, string> = {
  greetings: 'Мэндчилгээ',
  basics: 'Хэрэгтэй үгс',
  food: 'Хоол, ундаа',
  directions: 'Зам чиглэл',
  numbers: 'Тоо, үнэ',
  emergency: 'Онцгой тохиолдол',
};

export const ITINERARY_DAY_OPTIONS: readonly ItineraryDays[] = [1, 2, 3];

/** "1 өдөр" — the translator turns a bare day count into "1 day" / "2 days". */
export const dayCountMn = (days: ItineraryDays): string => `${days} өдөр`;

/* A price level drawn as currency symbols, which need no translating, plus a word that does —
 * the symbols alone are not an accessible name. */
export const PRICE_LEVEL_SYMBOL: Record<PriceLevel, string> = { 1: '₮', 2: '₮₮', 3: '₮₮₮' };

export const PRICE_LEVEL_MN: Record<PriceLevel, string> = {
  1: 'Хямд',
  2: 'Дундаж',
  3: 'Үнэтэй',
};

/* ---------------------------------------------------------------------------
 * Event dates.
 *
 * Formatted by hand rather than with Intl, for two reasons. The Mongolian form is "2026 оны 11
 * сарын 5", which `Intl.DateTimeFormat('mn')` does not produce on every runtime — and a date
 * that renders one way in the browser and another in the Worker is a hydration mismatch. And a
 * range wants collapsing ("5–7 Nov", not "5 Nov – 7 Nov"), which no formatter does for you.
 *
 * The strings come out of the API as YYYY-MM-DD, and are split rather than parsed into a Date:
 * `new Date('2026-11-05')` is midnight UTC, so anybody west of Greenwich would see the 4th.
 * ------------------------------------------------------------------------- */

const MONTHS_EN = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type Parts = { year: number; month: number; day: number };

/** YYYY-MM-DD → its three numbers, or null if it is not that shape. */
export function dateParts(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const parts = { year: Number(y), month: Number(m), day: Number(d) };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return null;
  return parts;
}

const oneDate = (p: Parts, lang: Lang) =>
  (lang === 'en'
    ? `${p.day} ${MONTHS_EN[p.month]} ${p.year}`
    : `${p.year} оны ${p.month} сарын ${p.day}`);

/**
 * One date, or a range with the repeated parts collapsed.
 *
 * "5–7 Nov 2026" / "2026 оны 11 сарын 5–7" within a month, "28 Nov – 2 Dec 2026" across two,
 * and both dates in full across two years. An unparseable date comes back as the raw string
 * rather than throwing — a row edited by hand should still render.
 */
export function formatEventDates(
  startDate: string,
  endDate: string | null,
  lang: Lang,
): string {
  const start = dateParts(startDate);
  if (!start) return endDate ? `${startDate} – ${endDate}` : startDate;

  const end = endDate ? dateParts(endDate) : null;
  // A single day, and an end date equal to the start, read the same way.
  if (!end || (end.year === start.year && end.month === start.month && end.day === start.day)) {
    return oneDate(start, lang);
  }

  if (start.year !== end.year) return `${oneDate(start, lang)} – ${oneDate(end, lang)}`;

  if (start.month === end.month) {
    return lang === 'en'
      ? `${start.day}–${end.day} ${MONTHS_EN[start.month]} ${start.year}`
      : `${start.year} оны ${start.month} сарын ${start.day}–${end.day}`;
  }

  return lang === 'en'
    ? `${start.day} ${MONTHS_EN[start.month]} – ${end.day} ${MONTHS_EN[end.month]} ${start.year}`
    : `${start.year} оны ${start.month} сарын ${start.day} – ${end.month} сарын ${end.day}`;
}

/** How many days from today an event has to start within to count as "this week". */
const THIS_WEEK_DAYS = 7;

/**
 * Is this event on in the next week?
 *
 * True for anything already running, and for anything starting within seven days. The events
 * tab leads with these, because "what is on while I am here" is the question somebody opening
 * it is actually asking. `today` is injected so a spec is not at the mercy of the clock.
 */
export function isThisWeek(
  event: { startDate: string; endDate: string | null },
  today: string,
): boolean {
  const start = dateParts(event.startDate);
  const now = dateParts(today);
  if (!start || !now) return false;

  // String comparison is enough for same-shaped ISO dates, and avoids a timezone entirely.
  if (event.startDate <= today) return true;

  const limit = new Date(Date.UTC(now.year, now.month - 1, now.day + THIS_WEEK_DAYS));
  return event.startDate <= limit.toISOString().slice(0, 10);
}
