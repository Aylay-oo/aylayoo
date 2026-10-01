import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Aimag, Guide, Place } from '../../lib/api';
import { DialogsProvider } from '../../lib/dialogs';
import { LangProvider } from '../../lib/i18n';
import { TravelStateProvider } from '../../lib/travel-state';
import type { Resource } from '../../lib/use-resource';
import { WhereSection } from './WhereSection';

/* Covers the section the whole design hangs off: the map selects aimags, the info card
 * follows the focused one, the checklist lists its places, and ticking a place re-scores the
 * recommended guides. */

const aimag = (over: Partial<Aimag> & Pick<Aimag, 'id' | 'slug' | 'isoCode'>): Aimag => ({
  nameMn: 'Аймаг', nameEn: 'Aimag', region: 'khangai', descriptionMn: null, descriptionEn: null,
  imageUrl: null, centerMn: 'Төв', centerEn: 'Center', areaKm2: 100, ...over,
});

const place = (over: Partial<Place> & Pick<Place, 'id' | 'aimagId' | 'nameMn'>): Place => ({
  nameEn: 'Place', descriptionMn: 'Тайлбар', descriptionEn: 'Description', category: 'nature',
  lat: null, lng: null, images: [], isMustSee: false, imageKey: 'lake',
  bestMonthsMn: null, bestMonthsEn: null, mustTitleMn: null, mustTitleEn: null,
  mustSummaryMn: null, mustSummaryEn: null, ...over,
});

const guide = (over: Partial<Guide> & Pick<Guide, 'id' | 'name' | 'aimags'>): Guide => ({
  type: 'individual', bioMn: null, bioEn: null, languages: ['mn', 'en'], tripTypes: ['countryside'],
  phone: '+976 99110000', email: 'a@example.com', photoUrl: null, website: null,
  createdAt: '2026-09-26T18:16:43.000Z',
  experienceYears: 5, routeMn: 'Хөвсгөл', routeEn: 'Khövsgöl', car: null,
  rating: null, reviewCount: null, ...over,
});

const KHUVSGUL = aimag({ id: 1, slug: 'khuvsgul', isoCode: 'MN-041', nameMn: 'Хөвсгөл', nameEn: 'Khövsgöl' });
const BAYANKHONGOR = aimag({ id: 2, slug: 'bayankhongor', isoCode: 'MN-069', nameMn: 'Баянхонгор', nameEn: 'Bayankhongor' });
const DORNOD = aimag({ id: 3, slug: 'dornod', isoCode: 'MN-061', nameMn: 'Дорнод', nameEn: 'Dornod', region: 'eastern' });

const PLACES = [
  place({ id: 10, aimagId: 2, nameMn: 'Ихбогд уул' }),
  place({ id: 11, aimagId: 2, nameMn: 'Цагаан агуй' }),
  place({ id: 20, aimagId: 1, nameMn: 'Хөвсгөл нуур' }),
  place({ id: 30, aimagId: 3, nameMn: 'Буйр нуур' }),
  place({ id: 31, aimagId: 3, nameMn: 'Халх голын дурсгал' }),
  place({ id: 32, aimagId: 3, nameMn: 'Монгол дагуурын тал' }),
];

const AIMAG_LINK = {
  khuvsgul: { id: 1, slug: 'khuvsgul', nameMn: 'Хөвсгөл', nameEn: 'Khövsgöl' },
  bayankhongor: { id: 2, slug: 'bayankhongor', nameMn: 'Баянхонгор', nameEn: 'Bayankhongor' },
  dornod: { id: 3, slug: 'dornod', nameMn: 'Дорнод', nameEn: 'Dornod' },
} as const;

/** Covers Khövsgöl and Bayankhongor, so it outranks either single-aimag guide. */
const BOTH = guide({ id: 1, name: 'Хоёр Аймаг', aimags: [
  AIMAG_LINK.khuvsgul, AIMAG_LINK.bayankhongor,
] });
const ONLY_BAYANKHONGOR = guide({ id: 2, name: 'Зөвхөн Баянхонгор', rating: 5, reviewCount: 40, aimags: [
  AIMAG_LINK.bayankhongor,
] });
/** Works in an aimag that is not selected by default, so it should not be listed. */
const ELSEWHERE = guide({ id: 3, name: 'Өөр Газар', aimags: [AIMAG_LINK.dornod] });

/* A pair with the same coverage count but different aimags, and a rating that puts the
 * Khövsgöl one first on a tie. Ticking a Bayankhongor place has to overturn that. */
const RATED_KHUVSGUL = guide({
  id: 4, name: 'Үнэлгээтэй Хөвсгөл', rating: 4, reviewCount: 10, aimags: [AIMAG_LINK.khuvsgul],
});
const UNRATED_BAYANKHONGOR = guide({
  id: 5, name: 'Үнэлгээгүй Баянхонгор', aimags: [AIMAG_LINK.bayankhongor],
});
/** Covers only Dornod, which holds three tickable places. */
const ONLY_DORNOD = guide({ id: 6, name: 'Зөвхөн Дорнод', aimags: [AIMAG_LINK.dornod] });

function resource<T>(data: T, over: Partial<Resource<T>> = {}): Resource<T> {
  return { data, loading: false, error: null, reload: jest.fn(), ...over };
}

function setup({
  aimags = [KHUVSGUL, BAYANKHONGOR],
  places = PLACES,
  guides = [BOTH, ONLY_BAYANKHONGOR, ELSEWHERE],
  overrides = {},
}: {
  aimags?: Aimag[];
  places?: Place[];
  guides?: Guide[];
  overrides?: {
    aimags?: Partial<Resource<Aimag[]>>;
    places?: Partial<Resource<Place[]>>;
    guides?: Partial<Resource<Guide[]>>;
  };
} = {}) {
  return render(
    <LangProvider>
      <TravelStateProvider>
        <DialogsProvider>
          <WhereSection
            aimags={resource(aimags, overrides.aimags)}
            places={resource(places, overrides.places)}
            guides={resource(guides, overrides.guides)}
          />
        </DialogsProvider>
      </TravelStateProvider>
    </LangProvider>,
  );
}

/* Scoped to the map, because the same aimag name is also a chip button in the info card and
 * a heading in the checklist. */
const map = () => document.querySelector('.map-svg') as HTMLElement;
const shape = (name: string) => within(map()).getByRole('button', { name });
const recommended = () => document.querySelector('.rec-grid') as HTMLElement;
const recommendedNames = () =>
  [...recommended().querySelectorAll('.g-top b')].map((el) => el.textContent);

describe('the map', () => {
  it('draws all 22 outlines even before the aimags arrive', () => {
    // The shapes are static, so an empty or failed API must not leave a blank box.
    setup({ aimags: [], overrides: { aimags: { loading: true } } });
    expect(document.querySelectorAll('.map-svg path')).toHaveLength(22);
    // ...but none of them pretends to be clickable yet.
    expect(document.querySelectorAll('.map-svg path[role="button"]')).toHaveLength(0);
  });

  it('colours a shape by its region and makes it selectable once loaded', () => {
    setup();
    expect(shape('Хөвсгөл').classList.contains('hangai')).toBe(true);
    expect(shape('Баянхонгор').classList.contains('hangai')).toBe(true);
    expect(shape('Баянхонгор').classList.contains('sel')).toBe(true);
  });

  it('starts on Bayankhongor, as the design did', () => {
    setup();
    expect(shape('Баянхонгор').getAttribute('aria-pressed')).toBe('true');
    expect(shape('Хөвсгөл').getAttribute('aria-pressed')).toBe('false');
  });

  it('selects an aimag when clicked', () => {
    setup();
    fireEvent.click(shape('Хөвсгөл'));
    expect(shape('Хөвсгөл').getAttribute('aria-pressed')).toBe('true');
    // Both are selected now — the map is multi-select.
    expect(shape('Баянхонгор').getAttribute('aria-pressed')).toBe('true');
  });

  it('is operable from the keyboard', () => {
    setup();
    fireEvent.keyDown(shape('Хөвсгөл'), { key: 'Enter' });
    expect(shape('Хөвсгөл').getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(shape('Хөвсгөл'), { key: ' ' });
    // Focused and selected, so Space deselects it.
    expect(shape('Хөвсгөл').getAttribute('aria-pressed')).toBe('false');
  });

  it('ignores other keys', () => {
    setup();
    fireEvent.keyDown(shape('Хөвсгөл'), { key: 'a' });
    expect(shape('Хөвсгөл').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('the info card', () => {
  it('describes the focused aimag', () => {
    setup();
    const card = document.querySelector('.info-card') as HTMLElement;
    expect(within(card).getByRole('heading', { level: 3 }).textContent).toContain('Баянхонгор');
    expect(card.textContent).toContain('Төв:');
    expect(card.textContent).toContain('100.0 мянган км²');
    expect(card.textContent).toContain('Хангайн бүс');
  });

  it('lists only that aimag\'s places', () => {
    setup();
    const card = document.querySelector('.info-card') as HTMLElement;
    expect(within(card).getByText('Ихбогд уул')).toBeTruthy();
    expect(within(card).queryByText('Хөвсгөл нуур')).toBeNull();
  });

  it('follows the focus to another aimag', () => {
    setup();
    fireEvent.click(shape('Хөвсгөл'));
    const card = document.querySelector('.info-card') as HTMLElement;
    expect(within(card).getByRole('heading', { level: 3 }).textContent).toContain('Хөвсгөл');
    expect(within(card).getByText('Хөвсгөл нуур')).toBeTruthy();
  });

  it('offers a retry when the places fail, without hiding the aimag', () => {
    const reload = jest.fn();
    setup({ places: [], overrides: { places: { error: 'boom', reload } } });
    const card = document.querySelector('.info-card') as HTMLElement;
    expect(within(card).getByRole('heading', { level: 3 }).textContent).toContain('Баянхонгор');
    fireEvent.click(within(card).getByRole('button', { name: 'Дахин оролдох' }));
    expect(reload).toHaveBeenCalled();
  });

  it('says so when nothing is selected', () => {
    setup();
    // Clicking the focused aimag a second time deselects the last one.
    fireEvent.click(shape('Баянхонгор'));
    expect(screen.getByText('Газрын зураг дээрээс очих аймгуудаа дарж сонгоно уу.')).toBeTruthy();
  });
});

describe('the checklist', () => {
  it('titles itself after the selection', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Баянхонгор аймагт очих газрууд' })).toBeTruthy();

    fireEvent.click(shape('Хөвсгөл'));
    expect(screen.getByRole('heading', { name: 'Сонгосон 2 аймагт очих газрууд' })).toBeTruthy();
  });

  it('counts the places a visitor ticks', () => {
    setup();
    const count = document.querySelector('.count') as HTMLElement;
    expect(count.textContent).toContain('0');

    fireEvent.click(screen.getByRole('checkbox', { name: /Ихбогд уул/ }));
    expect(count.textContent).toContain('1');
  });

  it('forgets ticks when the aimag is deselected', () => {
    setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /Ихбогд уул/ }));
    expect(document.querySelector('.count')?.textContent).toContain('1');

    fireEvent.click(shape('Баянхонгор'));
    expect(document.querySelector('.count')?.textContent).toContain('0');
  });
});

describe('the recommended guides', () => {
  it('leaves out anyone who does not work in a selected aimag', () => {
    setup();
    expect(recommendedNames()).not.toContain('Өөр Газар');
    expect(screen.getByText('2 хөтөч олдлоо')).toBeTruthy();
  });

  it('ranks a rated guide above an unrated one at the same coverage', () => {
    // One aimag selected, so both cover 1 — the rating breaks the tie.
    setup();
    expect(recommendedNames()).toEqual(['Зөвхөн Баянхонгор', 'Хоёр Аймаг']);
  });

  it('ranks wider coverage above any rating', () => {
    setup();
    fireEvent.click(shape('Хөвсгөл'));
    // Covering 2 aimags scores 20; covering 1 with a 5.0 rating scores 10.
    expect(recommendedNames()).toEqual(['Хоёр Аймаг', 'Зөвхөн Баянхонгор']);
  });

  it('shows how much of the selection each guide covers, once there is more than one', () => {
    setup();
    expect(recommended().querySelector('.cover')).toBeNull();

    fireEvent.click(shape('Хөвсгөл'));
    expect(screen.getByText('Таны сонголтоос 2/2 аймагт аялуулна')).toBeTruthy();
    expect(screen.getByText('Таны сонголтоос 1/2 аймагт аялуулна')).toBeTruthy();
  });

  it('still prefers wider coverage even when the narrower guide has every tick', () => {
    /* What the ×10 weighting buys. Three aimags selected, and all three of Dornod's places
     * ticked: the Dornod-only guide scores 1×10 + 3 = 13, while the guide covering two
     * aimags with nothing ticked scores 2×10 + 0 = 20. A smaller weight would let a handful
     * of ticks outrank being able to cover more of the trip. */
    setup({
      aimags: [KHUVSGUL, BAYANKHONGOR, DORNOD],
      guides: [BOTH, ONLY_DORNOD],
    });
    fireEvent.click(shape('Хөвсгөл'));
    fireEvent.click(shape('Дорнод'));
    for (const name of [/Буйр нуур/, /Халх голын дурсгал/, /Монгол дагуурын тал/]) {
      fireEvent.click(screen.getByRole('checkbox', { name }));
    }
    expect(recommendedNames()).toEqual(['Хоёр Аймаг', 'Зөвхөн Дорнод']);
  });

  it('lets a ticked place overturn a rating between guides covering different aimags', () => {
    /* Both cover exactly one selected aimag, so coverage ties at 10 and the rated Khövsgöl
     * guide would come first. Ticking a Bayankhongor place adds 1 to the other's score,
     * which outranks any rating. */
    setup({ guides: [RATED_KHUVSGUL, UNRATED_BAYANKHONGOR] });
    fireEvent.click(shape('Хөвсгөл'));
    expect(recommendedNames()).toEqual(['Үнэлгээтэй Хөвсгөл', 'Үнэлгээгүй Баянхонгор']);

    fireEvent.click(screen.getByRole('checkbox', { name: /Ихбогд уул/ }));
    expect(recommendedNames()).toEqual(['Үнэлгээгүй Баянхонгор', 'Үнэлгээтэй Хөвсгөл']);
  });

  it('hides the stars for a guide with no rating yet', () => {
    setup({ guides: [BOTH] });
    const card = recommended().querySelector('.g-card') as HTMLElement;
    expect(within(card).queryByText('★')).toBeNull();
  });

  it('shows them for a guide who has one', () => {
    setup({ guides: [ONLY_BAYANKHONGOR] });
    const card = recommended().querySelector('.g-card') as HTMLElement;
    expect(card.textContent).toContain('5.0');
    expect(card.textContent).toContain('(40)');
  });
});

describe('travel modes', () => {
  it('shows the countryside panel first and keeps the city one mounted', () => {
    setup();
    expect(document.getElementById('modeCountry')?.hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('modeCity')?.hasAttribute('hidden')).toBe(true);
  });

  it('switches to the city panel', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: /Хотоор аялах/ }));
    expect(document.getElementById('modeCity')?.hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('modeCountry')?.hasAttribute('hidden')).toBe(true);
    expect(screen.getByRole('tab', { name: /Хотоор аялах/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps the city tiles and nearby trips working with no API data at all', () => {
    setup({ aimags: [], places: [], guides: [], overrides: { aimags: { error: 'down' } } });
    fireEvent.click(screen.getByRole('tab', { name: /Хотоор аялах/ }));
    expect(screen.getByText('Улаанбаатар хотын аялал')).toBeTruthy();
    expect(document.querySelectorAll('.tile')).toHaveLength(4);
    expect(screen.getByText('Цонжин Болдог (Чингис хааны морьт хөшөө)')).toBeTruthy();
  });
});
