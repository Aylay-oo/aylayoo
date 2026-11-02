import { fireEvent, render, screen } from '@testing-library/react';
import type { AimagWithPlaces, Guide, Place } from '../../../lib/api';
import { ApiError } from '../../../lib/api';
import { getAimag, getGuidesForAimag } from '../../../lib/api-server';
import { AimagDetail } from './AimagDetail';
import { generateMetadata } from './page';

/* A different slug per test: page.tsx memoises its loaders with React's cache(), which outside a
 * real request has no per-request boundary to be cleared at. */

jest.mock('../../../lib/api-server', () => {
  const actual = jest.requireActual('../../../lib/api-server');
  return { ...actual, getAimag: jest.fn(), getGuidesForAimag: jest.fn() };
});

const mockGetAimag = jest.mocked(getAimag);
const mockGetGuides = jest.mocked(getGuidesForAimag);

function place(over: Partial<Place> = {}): Place {
  return {
    id: 1,
    aimagId: 9,
    nameMn: 'Хөвсгөл нуур',
    nameEn: 'Lake Khövsgöl',
    descriptionMn: 'Цэнгэг уст нуур',
    descriptionEn: 'Freshwater lake',
    category: 'nature',
    lat: null,
    lng: null,
    images: [],
    isMustSee: false,
    imageKey: 'lake',
    bestMonthsMn: null,
    bestMonthsEn: null,
    mustTitleMn: null,
    mustTitleEn: null,
    mustSummaryMn: null,
    mustSummaryEn: null,
    ...over,
  };
}

function aimag(over: Partial<AimagWithPlaces> = {}): AimagWithPlaces {
  return {
    id: 9,
    slug: 'khuvsgul',
    nameMn: 'Хөвсгөл',
    nameEn: 'Khövsgöl',
    region: 'khangai',
    // NULL for all 22 rows in production — nothing has ever filled these.
    descriptionMn: null,
    descriptionEn: null,
    imageUrl: null,
    isoCode: 'MN-041',
    centerMn: 'Мөрөн',
    centerEn: 'Mörön',
    areaKm2: 100.6,
    places: [place()],
    ...over,
  };
}

function guide(over: Partial<Guide> = {}): Guide {
  return {
    id: 11,
    type: 'individual',
    name: 'Б. Болормаа',
    bioMn: null,
    bioEn: null,
    languages: ['en', 'ko'],
    tripTypes: ['countryside'],
    photoUrl: null,
    website: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    fullName: null,
    experienceYears: 6,
    experienceRange: null,
    routeMn: null,
    routeEn: null,
    car: null,
    rating: null,
    reviewCount: null,
    aimags: [{ id: 9, slug: 'khuvsgul', nameMn: 'Хөвсгөл', nameEn: 'Khövsgöl' }],
    ...over,
  };
}

const params = (slug: string) => Promise.resolve({ slug });
const guidesResult = (data: Guide[]) => ({
  data,
  pagination: { page: 1, limit: 50, total: data.length, totalPages: 1 },
});

beforeEach(() => mockGetGuides.mockResolvedValue(guidesResult([])));
afterEach(() => {
  mockGetAimag.mockReset();
  mockGetGuides.mockReset();
});

describe('generateMetadata', () => {
  it('composes a description, because the aimag table has no prose to read', async () => {
    mockGetAimag.mockResolvedValue(aimag({ slug: 'a1' }));
    const meta = await generateMetadata({ params: params('a1') });

    expect(meta.title).toBe('Хөвсгөл | АЯЛЪЯ ӨӨ');
    expect(meta.description).toBe('Хөвсгөл — Хангайн бүс, төв нь Мөрөн, 1 үзэх газар.');
    expect(meta.alternates?.canonical).toBe('/aimags/a1');
  });

  it('borrows a must-see place for its share card ahead of an ordinary one', async () => {
    mockGetAimag.mockResolvedValue(aimag({
      slug: 'a2',
      places: [
        place({ id: 2, nameMn: 'Уушигийн өвөр буган хөшөө', imageKey: 'steppe' }),
        place({ id: 3, nameMn: 'Хөвсгөл нуур', isMustSee: true }),
      ],
    }));
    const meta = await generateMetadata({ params: params('a2') });

    expect(meta.openGraph?.images).toEqual([{ url: '/og/khuvsgul.jpg', alt: 'Хөвсгөл' }]);
  });

  it('falls back to the site card when the aimag has no places at all', async () => {
    mockGetAimag.mockResolvedValue(aimag({ slug: 'a3', places: [] }));
    const meta = await generateMetadata({ params: params('a3') });

    expect(meta.openGraph?.images).toEqual([{ url: '/og/hero1.jpg', alt: 'Хөвсгөл' }]);
    expect(meta.description).toBe('Хөвсгөл — Хангайн бүс, төв нь Мөрөн.');
  });

  it('reports an unknown slug as noindex', async () => {
    mockGetAimag.mockResolvedValue(null);
    const meta = await generateMetadata({ params: params('nope') });

    expect(meta.title).toBe('Хуудас олдсонгүй | АЯЛЪЯ ӨӨ');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

const switchTo = (lang: 'mn' | 'en') =>
  fireEvent.change(screen.getByLabelText('Хэл сонгох'), { target: { value: lang } });

describe('AimagDetail', () => {
  it('links every place to its own page', () => {
    render(<AimagDetail aimag={aimag()} guides={[]} />);

    expect(screen.getByRole('link', { name: /Хөвсгөл нуур/ }).getAttribute('href'))
      .toBe('/places/1');
  });

  it('links every guide who covers it', () => {
    render(<AimagDetail aimag={aimag()} guides={[guide(), guide({ id: 12, name: 'Г. Батзориг' })]} />);

    expect(screen.getByRole('link', { name: /Б. Болормаа/ }).getAttribute('href'))
      .toBe('/guides/11');
    expect(screen.getByRole('link', { name: /Г. Батзориг/ }).getAttribute('href'))
      .toBe('/guides/12');
  });

  it('says so plainly when nobody covers it yet', () => {
    render(<AimagDetail aimag={aimag({ places: [] })} guides={[]} />);

    expect(screen.getByText('Энэ аймагт бүртгэлтэй газар одоохондоо алга.')).toBeTruthy();
    expect(screen.getByText('Энэ аймагт бүртгэлтэй хөтөч одоохондоо алга.')).toBeTruthy();
  });

  it('prints the area through the translator rule, not as a bare number', () => {
    render(<AimagDetail aimag={aimag()} guides={[]} />);
    expect(screen.getByText('100.6 мянган км²')).toBeTruthy();

    switchTo('en');
    expect(screen.getByText('100.6 thousand km²')).toBeTruthy();
  });

  it('carries its own title into English', () => {
    render(<AimagDetail aimag={aimag()} guides={[]} />);
    expect(document.title).toBe('Хөвсгөл | АЯЛЪЯ ӨӨ');

    switchTo('en');
    expect(document.title).toBe('Khövsgöl | AYLAYOO');
  });
});

describe('the guide list failing', () => {
  it('does not take the aimag page down with it', async () => {
    // A guide list that will not load is a worse outcome than an aimag page with no guides.
    mockGetAimag.mockResolvedValue(aimag({ slug: 'a4' }));
    mockGetGuides.mockRejectedValue(new ApiError('Сервертэй холбогдож чадсангүй'));

    const meta = await generateMetadata({ params: params('a4') });
    expect(meta.title).toBe('Хөвсгөл | АЯЛЪЯ ӨӨ');
  });
});
