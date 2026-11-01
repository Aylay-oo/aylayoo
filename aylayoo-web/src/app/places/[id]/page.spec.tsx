import { fireEvent, render, screen } from '@testing-library/react';
import type { Place } from '../../../lib/api';
import { getPlace } from '../../../lib/api';
import { generateMetadata } from './page';
import { PlaceDetail } from './PlaceDetail';

/* The server half and the client half of /places/[id].
 *
 * generateMetadata is an ordinary async function, so it is tested directly — rendering the page
 * component itself would mean standing up a request context jsdom does not have. What it returns
 * is the whole SEO contract for the route: title, canonical and share image.
 *
 * Each test uses a different id on purpose. page.tsx wraps its loader in React's cache(), which
 * memoises on the argument, and outside a real request that memo has no per-request boundary to
 * be cleared at — so reusing an id would hand the next test the previous test's place.
 */

jest.mock('../../../lib/api', () => {
  const actual = jest.requireActual('../../../lib/api');
  return { ...actual, getPlace: jest.fn() };
});

const mockGetPlace = jest.mocked(getPlace);

function place(over: Partial<Place> = {}): Place {
  return {
    id: 42,
    aimagId: 7,
    nameMn: 'Хонгорын элс',
    nameEn: 'Khongor Sand Dunes',
    descriptionMn: 'Дуулдаг элсэн манхан',
    descriptionEn: 'The singing sand dunes',
    category: 'nature',
    lat: null,
    lng: null,
    images: [],
    isMustSee: false,
    imageKey: 'desert',
    bestMonthsMn: null,
    bestMonthsEn: null,
    mustTitleMn: null,
    mustTitleEn: null,
    mustSummaryMn: null,
    mustSummaryEn: null,
    aimagSlug: 'umnugovi',
    aimagNameMn: 'Өмнөговь',
    aimagNameEn: 'Ömnögovi',
    ...over,
  };
}

const params = (id: string) => Promise.resolve({ id });

afterEach(() => mockGetPlace.mockReset());

describe('generateMetadata', () => {
  it('titles the page after the place, with the brand behind it', async () => {
    mockGetPlace.mockResolvedValue(place({ id: 1 }));
    const meta = await generateMetadata({ params: params('1') });

    expect(meta.title).toBe('Хонгорын элс | АЯЛЪЯ ӨӨ');
    expect(meta.description).toBe('Дуулдаг элсэн манхан');
  });

  it('points the canonical URL at its own path', async () => {
    mockGetPlace.mockResolvedValue(place({ id: 2 }));
    const meta = await generateMetadata({ params: params('2') });

    expect(meta.alternates?.canonical).toBe('/places/2');
    expect(meta.openGraph?.url).toBe('/places/2');
  });

  it('shares the card built from the same photo the place shows', async () => {
    // "Хонгорын элс" is pinned to the khongor photo by name, whatever its imageKey says.
    mockGetPlace.mockResolvedValue(place({ id: 3 }));
    const meta = await generateMetadata({ params: params('3') });

    expect(meta.openGraph?.images).toEqual([{ url: '/og/khongor.jpg', alt: 'Хонгорын элс' }]);
    expect(meta.twitter?.images).toEqual(['/og/khongor.jpg']);
  });

  it('prefers the must-see summary, which reads wider than the description', async () => {
    mockGetPlace.mockResolvedValue(place({
      id: 4,
      mustSummaryMn: 'Үлэг гүрвэлийн өндөг олдсон Баянзаг болон дуулдаг элс.',
    }));
    const meta = await generateMetadata({ params: params('4') });

    expect(meta.description).toBe('Үлэг гүрвэлийн өндөг олдсон Баянзаг болон дуулдаг элс.');
  });

  it('still writes a sentence when the row has no prose at all', async () => {
    mockGetPlace.mockResolvedValue(place({ id: 5, descriptionMn: null, descriptionEn: null }));
    const meta = await generateMetadata({ params: params('5') });

    expect(meta.description).toBe('Хонгорын элс — Өмнөговь.');
  });

  it('reports a missing place as noindex rather than titling it after nothing', async () => {
    mockGetPlace.mockResolvedValue(null);
    const meta = await generateMetadata({ params: params('6') });

    expect(meta.title).toBe('Хуудас олдсонгүй | АЯЛЪЯ ӨӨ');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('does not ask the API about an id that is not a positive integer', async () => {
    for (const bad of ['abc', '0', '-3', '1.5']) {
      const meta = await generateMetadata({ params: params(bad) });
      expect(meta.robots).toEqual({ index: false, follow: false });
    }
    expect(mockGetPlace).not.toHaveBeenCalled();
  });
});

/* PlaceDetail owns its own LangProvider, so a probe rendered beside it is outside the context.
 * The switch in the page's own chrome is the thing to drive anyway — it is what a visitor uses. */
const switchTo = (lang: 'mn' | 'en') =>
  fireEvent.change(screen.getByLabelText('Хэл сонгох'), { target: { value: lang } });

describe('PlaceDetail', () => {
  it('names the place and says which aimag it is in', () => {
    render(<PlaceDetail place={place()} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Хонгорын элс');
    // Twice over: once in the breadcrumb, once in the facts list. Both lead to the same page.
    const links = screen.getAllByRole('link', { name: 'Өмнөговь' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.getAttribute('href')).toBe('/aimags/umnugovi');
  });

  it('reads in English once the language is switched', () => {
    render(<PlaceDetail place={place()} />);
    switchTo('en');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Khongor Sand Dunes');
    expect(screen.getByText('Nature')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Ömnögovi' })).toHaveLength(2);
  });

  it('keeps its own title through a language switch, rather than the home page\'s', () => {
    // The effect in i18n.tsx owns document.title outright; before `titles` it hard-coded the
    // home page's pair, so switching language on a detail page renamed it to the home page.
    render(<PlaceDetail place={place()} />);
    expect(document.title).toBe('Хонгорын элс | АЯЛЪЯ ӨӨ');

    switchTo('en');
    expect(document.title).toBe('Khongor Sand Dunes | AYLAYOO');
  });

  it('flags a must-see place and prints its season', () => {
    render(<PlaceDetail place={place({ isMustSee: true, bestMonthsMn: '5–10 сар' })} />);

    expect(screen.getByText('Заавал үзэх газрууд')).toBeTruthy();
    expect(screen.getByText('5–10 сар')).toBeTruthy();
  });

  it('leaves the season out when the row has none', () => {
    render(<PlaceDetail place={place()} />);
    expect(screen.queryByText('Хамгийн таатай цаг:')).toBeNull();
  });

  it('offers the way back to the map', () => {
    render(<PlaceDetail place={place()} />);
    expect(screen.getByRole('link', { name: 'Газрын зураг дээр харах' }).getAttribute('href'))
      .toBe('/#where');
  });
});
