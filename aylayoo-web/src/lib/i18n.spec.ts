import { I18N_EN } from './i18n-dictionary';
import { translate } from './i18n';

/* Every expectation here was produced by running the design's own T() over the same input,
 * so this file is the contract between the mockup's English and ours. */

describe('the dictionary', () => {
  it('has the design\'s 397 entries', () => {
    expect(Object.keys(I18N_EN)).toHaveLength(397);
  });

  it('covers the content as well as the interface', () => {
    // This is what let the API's _en columns be filled from the mockup instead of being
    // translated by hand.
    expect(I18N_EN['Хөвсгөл нуур (Далай ээж)']).toBe('Lake Khövsgöl (Dalai Eej)');
    expect(I18N_EN['Олонлог төв сургууль']).toBe('Olonlog Center School');
    expect(I18N_EN['Багийн ахлагч, Full-Stack хөгжүүлэгч']).toBe('Team lead, Full-Stack developer');
  });
});

describe('translate', () => {
  it.each([
    ['Нүүр', 'Home'],
    ['Хөтөч', 'Guides'],
    ['Аяллын компани', 'Tour company'],
    ['Энэ аймагт бүртгэлтэй хөтөч одоохондоо алга.', 'No guides are registered in this province yet.'],
  ])('looks up %s in the dictionary', (mn, en) => {
    expect(translate(mn)).toBe(en);
  });

  it('leaves a string it has never seen alone', () => {
    // A guide who registers with a Mongolian bio the dictionary cannot know shows as typed,
    // rather than as an empty string or a placeholder.
    expect(translate('Ямар нэг танихгүй мөр')).toBe('Ямар нэг танихгүй мөр');
  });

  it('leaves a string with no Mongolian in it alone', () => {
    expect(translate('Guide / Hutch')).toBe('Guide / Hutch');
    expect(translate('Land Cruiser 200 / Delica')).toBe('Land Cruiser 200 / Delica');
  });

  describe('strings the page builds as it runs', () => {
    it.each([
      ['3 хөтөч олдлоо', '3 guides found'],
      ['1 хөтөч олдлоо', '1 guide found'],
      ['0 хөтөч олдлоо', '0 guides found'],
      ['116.0 мянган км²', '116.0 thousand km²'],
      ['6 жил', '6 years'],
      ['50 км зайд', 'Within 50 km'],
      ['≈54 км', '≈54 km'],
      ['4.9 · 128 үнэлгээ', '4.9 · 128 reviews'],
      ['6–8 сар', 'Jun–Aug'],
      ['5–10 сар', 'May–Oct'],
      ['Хугацаа: 1 цаг', 'Duration: 1 h'],
      ['Хугацаа: 1.5 цаг', 'Duration: 1.5 h'],
      // The nearest trips are quoted in minutes and the furthest in days.
      ['Хугацаа: 30 мин', 'Duration: 30 min'],
      ['Хугацаа: 2 өдөр', 'Duration: 2 days'],
      ['Хугацаа: 2–3 өдөр', 'Duration: 2–3 days'],
      ['Сонгосон аймгууд (3)', 'Selected provinces (3)'],
      ['Таны сонголтоос 2/3 аймагт аялуулна', 'Covers 2 of your 3 provinces'],
    ])('%s → %s', (mn, en) => {
      expect(translate(mn)).toBe(en);
    });

    it('singular and plural differ for the guide count', () => {
      expect(translate('1 хөтөч олдлоо')).toContain(' guide found');
      expect(translate('2 хөтөч олдлоо')).toContain(' guides found');
    });

    it('translates a month range through the month names, not the dictionary', () => {
      expect(translate('7–9 сар')).toBe('Jul–Sep');
      // "All year" is a plain dictionary entry, not a range.
      expect(translate('Жилийн турш')).toBe('All year');
    });
  });

  describe('checklist headings translate the aimag inside them', () => {
    it.each([
      ['Хөвсгөл аймагт очих газрууд', 'Places to visit in Khövsgöl'],
      ['Улаанбаатар хотод очих газрууд', 'Places to visit in Ulaanbaatar'],
      ['Сонгосон 4 аймагт очих газрууд', 'Places to visit in 4 selected provinces'],
    ])('%s → %s', (mn, en) => {
      expect(translate(mn)).toBe(en);
    });

    it('prefers the "N selected" form over the generic one', () => {
      // Both patterns match "Сонгосон 4 аймагт очих газрууд"; the specific one is first, so
      // it must not come out as "Places to visit in Сонгосон 4".
      expect(translate('Сонгосон 4 аймагт очих газрууд')).not.toContain('Сонгосон');
    });
  });

  describe('dialog titles and chips translate the name inside them', () => {
    it.each([
      ['Хөвсгөл хасах', 'Remove Khövsgöl'],
      ['Б. Болормаа-тай холбогдох', 'Contact B. Bolormaa'],
      ['Манзуширын хийд — захиалга', 'Book: Manzushir Monastery'],
    ])('%s → %s', (mn, en) => {
      expect(translate(mn)).toBe(en);
    });
  });

  describe('a comma list translates element by element', () => {
    it.each([
      ['Англи, Солонгос', 'English, Korean'],
      ['Монгол, Англи, Хятад', 'Mongolian, English, Chinese'],
      ['Хөвсгөл, Архангай, Булган', 'Khövsgöl, Arkhangai, Bulgan'],
    ])('%s → %s', (mn, en) => {
      expect(translate(mn)).toBe(en);
    });

    it('leaves the whole list alone when any element is unknown', () => {
      // Half-translating a list reads worse than not translating it, so the design bailed.
      const mixed = 'Англи, Ямар нэг юм';
      expect(translate(mixed)).toBe(mixed);
    });
  });

  describe('label and value are separate lookups, as in the design', () => {
    // The mockup translated one text node at a time, and its dictionary keys keep the colon.
    it.each([
      ['Хэл:', 'Languages:'],
      ['Машин:', 'Vehicle:'],
      ['Туршлага:', 'Experience:'],
      ['Чиглэл:', 'Routes:'],
      ['Төв:', 'Center:'],
      ['Талбай:', 'Area:'],
      ['Сонгосон:', 'Selected:'],
    ])('%s → %s', (mn, en) => {
      expect(translate(mn)).toBe(en);
    });

    it('does not translate a label glued to its value', () => {
      // Documents why components must render these as two pieces: the generic "X: Y" rule
      // looks up "Хэл" without its colon, which is not a dictionary key.
      expect(translate('Хэл: Англи, Солонгос')).toBe('Хэл: English, Korean');
    });

    /* A tour's duration appears as a badge on its own, not after a label, so it needs its own
     * patterns. The "1 цаг 30 мин" case is the one that matters: it is what fails if the hours
     * pattern is ever left unanchored, because it would match and drop the minutes. */
    it.each([
      ['90 мин', '90 min'],
      ['2 цаг', '2 h'],
      ['1 цаг 30 мин', '1 h 30 min'],
      ['3 цаг 15 мин', '3 h 15 min'],
    ])('a bare duration: %s → %s', (mn, en) => {
      expect(translate(mn)).toBe(en);
    });

    it('but the trip duration only translates whole', () => {
      // The opposite case: one text node in the design, matched by its own pattern.
      expect(translate('Хугацаа: 1 цаг')).toBe('Duration: 1 h');
      expect(translate('Хугацаа: 3–4 цаг')).toBe('Duration: 3–4 h');
      expect(translate('Хугацаа:')).toBe('Хугацаа:');
    });
  });
});
