import { PHOTO_KEYS, POOL, photoKey } from './photos';
import { translate } from './i18n';
import { TRIPS, TRIP_RADII } from './static-data';

/* The trip cards' content, which no other spec can see.
 *
 * i18n-coverage.spec.ts scans the sources for `t('…')` literals, but a trip's name and blurb
 * reach t() as `t(trip.name)` — a variable. So a trip added without its English would show a
 * Mongolian card on the English site and nothing would fail. This closes that gap, and pins
 * the few other things a hand-edited table gets wrong: a photo key with no pool, a distance
 * the "≈N км" tag cannot render, a duration the translator has no rule for.
 */

const ALL = TRIP_RADII.flatMap((radius) => TRIPS[radius].map((trip) => ({ radius, trip })));

describe('the trips table', () => {
  it('offers five trips at every distance', () => {
    for (const radius of TRIP_RADII) expect(TRIPS[radius]).toHaveLength(5);
  });

  it('lists them nearest first', () => {
    // The cards are rendered in table order, so the table is the sort.
    for (const radius of TRIP_RADII) {
      const km = TRIPS[radius].map((trip) => trip.km);
      expect([...km].sort((a, b) => a - b)).toEqual(km);
    }
  });

  it('names every trip once', () => {
    const names = ALL.map(({ trip }) => trip.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('every trip reads in English', () => {
  it.each(ALL.map(({ trip }) => [trip.name] as const))('translates the name %s', (name) => {
    expect(translate(name)).not.toBe(name);
    expect(translate(name)).not.toMatch(/[А-Яа-яЁёӨөҮү]/);
  });

  it.each(ALL.map(({ trip }) => [trip.name, trip.desc] as const))(
    'translates the blurb under %s',
    (_name, desc) => {
      expect(translate(desc)).not.toBe(desc);
      expect(translate(desc)).not.toMatch(/[А-Яа-яЁёӨөҮү]/);
    },
  );

  it.each(ALL.map(({ trip }) => [trip.name, trip.time] as const))(
    'translates the duration of %s',
    (_name, time) => {
      // One string, the way the card builds it — see the note in i18n.tsx.
      const en = translate(`Хугацаа: ${time}`);
      expect(en).toMatch(/^Duration: /);
      expect(en).not.toMatch(/[А-Яа-яЁёӨөҮү]/);
    },
  );

  it.each(ALL.map(({ trip }) => [trip.name, trip.km] as const))(
    'renders the distance tag for %s',
    (_name, km) => {
      expect(translate(`≈${km} км`)).toBe(`≈${km} km`);
    },
  );
});

describe('every trip has a photo', () => {
  it.each(ALL.map(({ trip }) => [trip.name, trip.imageKey] as const))(
    'resolves one for %s',
    (name, imageKey) => {
      // photoKey falls back to the steppe pool for a key it does not know, so asserting it
      // returns *something* proves nothing; the key has to be one the lookup really has.
      const key = photoKey(imageKey, name);
      expect(PHOTO_KEYS).toContain(key);
    },
  );

  it('gives no two trips on the same tab the same photo', () => {
    /* A pool is only a handful of photos deep and photoKey hashes the name into it, so two
     * trips in one tab can land on the same one — which reads as a mistake when the cards
     * sit side by side. Across tabs it does not matter: they are never on screen together. */
    for (const radius of TRIP_RADII) {
      const keys = TRIPS[radius].map((trip) => photoKey(trip.imageKey, trip.name));
      expect(keys).toHaveLength(new Set(keys).size);
    }
  });

  it('names a pool that exists for each one', () => {
    /* A typo'd imageKey does not throw — photoKey falls back to the steppe pool — so the
     * only symptom is several unrelated trips quietly sharing a photo of horses. */
    const unknown = ALL
      .filter(({ trip }) => !(trip.imageKey in POOL))
      .map(({ trip }) => `${trip.name}: ${trip.imageKey}`);
    expect(unknown).toEqual([]);
  });
});
