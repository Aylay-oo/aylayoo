import {
  PHRASE_CATEGORIES, PHRASE_CATEGORY_MN, PRICE_LEVEL_MN, TIMES_OF_DAY, TIME_OF_DAY_MN,
  TIP_TOPICS, TIP_TOPIC_MN, dateParts, dayCountMn, formatEventDates, isThisWeek,
} from './city-labels';
import { translate } from './i18n';

/* The city section's labels and date formatting.
 *
 * Why this file exists at all: i18n-coverage.spec.ts scans the sources for `t('…')` literals,
 * and every heading here reaches t() as `t(TIP_TOPIC_MN[tip.topic])` — a variable. So a topic
 * added without its English would print a Mongolian heading on the English site and nothing
 * would fail. Same gap trips.spec.ts closes for the trip table.
 */

const CYRILLIC = /[А-Яа-яЁёӨөҮү]/;

describe('every city label reads in English', () => {
  const all: [string, string][] = [
    ...TIMES_OF_DAY.map((k) => [`time of day: ${k}`, TIME_OF_DAY_MN[k]] as [string, string]),
    ...TIP_TOPICS.map((k) => [`tip topic: ${k}`, TIP_TOPIC_MN[k]] as [string, string]),
    ...PHRASE_CATEGORIES.map(
      (k) => [`phrase category: ${k}`, PHRASE_CATEGORY_MN[k]] as [string, string],
    ),
    ...([1, 2, 3] as const).map(
      (k) => [`price level: ${k}`, PRICE_LEVEL_MN[k]] as [string, string],
    ),
  ];

  it('has labels to check', () => {
    // A record that lost its keys would make every assertion below pass for the wrong reason.
    expect(all.length).toBe(TIMES_OF_DAY.length + TIP_TOPICS.length + PHRASE_CATEGORIES.length + 3);
  });

  it.each(all)('translates the %s', (_name, mn) => {
    expect(translate(mn)).not.toBe(mn);
    expect(translate(mn)).not.toMatch(CYRILLIC);
  });

  it('names every heading once, so two groups cannot share a title', () => {
    const headings = [...TIP_TOPICS.map((k) => TIP_TOPIC_MN[k]),
      ...PHRASE_CATEGORIES.map((k) => PHRASE_CATEGORY_MN[k])];
    expect(new Set(headings).size).toBe(headings.length);
  });
});

describe('dayCountMn', () => {
  it.each([[1, '1 day'], [2, '2 days'], [3, '3 days']] as const)(
    'turns %i into "%s" in English',
    (days, english) => {
      expect(translate(dayCountMn(days))).toBe(english);
    },
  );
});

describe('dateParts', () => {
  it('reads a YYYY-MM-DD date', () => {
    expect(dateParts('2026-11-05')).toEqual({ year: 2026, month: 11, day: 5 });
  });

  it.each(['', '2026-11', '05/11/2026', '2026-13-01', '2026-11-00', 'not a date'])(
    'refuses %s rather than throwing',
    (value) => {
      expect(dateParts(value)).toBeNull();
    },
  );
});

describe('formatEventDates', () => {
  it('writes a single day in each language', () => {
    expect(formatEventDates('2026-11-05', null, 'en')).toBe('5 Nov 2026');
    expect(formatEventDates('2026-11-05', null, 'mn')).toBe('2026 оны 11 сарын 5');
  });

  it('treats an end date equal to the start as a single day', () => {
    expect(formatEventDates('2026-11-05', '2026-11-05', 'en')).toBe('5 Nov 2026');
  });

  it('collapses a range inside one month', () => {
    expect(formatEventDates('2026-11-05', '2026-11-07', 'en')).toBe('5–7 Nov 2026');
    expect(formatEventDates('2026-11-05', '2026-11-07', 'mn')).toBe('2026 оны 11 сарын 5–7');
  });

  it('names both months across a month boundary, but the year once', () => {
    expect(formatEventDates('2026-11-28', '2026-12-02', 'en')).toBe('28 Nov – 2 Dec 2026');
    expect(formatEventDates('2026-11-28', '2026-12-02', 'mn'))
      .toBe('2026 оны 11 сарын 28 – 12 сарын 2');
  });

  it('writes both dates in full across a year boundary', () => {
    expect(formatEventDates('2026-12-28', '2027-01-03', 'en')).toBe('28 Dec 2026 – 3 Jan 2027');
  });

  it('falls back to the raw strings for a date it cannot read', () => {
    // A row edited by hand should still render rather than crash the events tab.
    expect(formatEventDates('whenever', null, 'en')).toBe('whenever');
    expect(formatEventDates('whenever', '2026-11-05', 'en')).toBe('whenever – 2026-11-05');
  });

  it('does not shift the day by a timezone', () => {
    /* new Date('2026-11-05') is midnight UTC, so anything west of Greenwich would read the
     * 4th. The formatter splits the string instead of parsing it, which is what this pins. */
    expect(formatEventDates('2026-11-01', null, 'en')).toBe('1 Nov 2026');
    expect(formatEventDates('2026-01-01', null, 'en')).toBe('1 Jan 2026');
  });
});

describe('isThisWeek', () => {
  const today = '2026-11-02';

  it('counts an event already running', () => {
    expect(isThisWeek({ startDate: '2026-10-30', endDate: '2026-11-10' }, today)).toBe(true);
  });

  it('counts one starting today', () => {
    expect(isThisWeek({ startDate: today, endDate: null }, today)).toBe(true);
  });

  it('counts one starting inside seven days, and the seventh day itself', () => {
    expect(isThisWeek({ startDate: '2026-11-05', endDate: null }, today)).toBe(true);
    expect(isThisWeek({ startDate: '2026-11-09', endDate: null }, today)).toBe(true);
  });

  it('does not count one starting after that', () => {
    expect(isThisWeek({ startDate: '2026-11-10', endDate: null }, today)).toBe(false);
  });

  it('crosses a month end correctly', () => {
    expect(isThisWeek({ startDate: '2026-12-03', endDate: null }, '2026-11-28')).toBe(true);
    expect(isThisWeek({ startDate: '2026-12-10', endDate: null }, '2026-11-28')).toBe(false);
  });

  it('says no rather than throwing on an unreadable date', () => {
    expect(isThisWeek({ startDate: 'soon', endDate: null }, today)).toBe(false);
    expect(isThisWeek({ startDate: today, endDate: null }, 'today')).toBe(false);
  });
});
