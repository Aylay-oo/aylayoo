import { fireEvent, render, screen } from '@testing-library/react';
import type { Guide } from '../../../lib/api';
import { getGuide } from '../../../lib/api-server';
import { GuideDetail } from './GuideDetail';
import { toGuideView } from './guide-view';
import { generateMetadata } from './page';

/* A different id per test: page.tsx memoises its loader with React's cache(), which outside a
 * real request has no per-request boundary to be cleared at. */

jest.mock('../../../lib/api-server', () => {
  const actual = jest.requireActual('../../../lib/api-server');
  return { ...actual, getGuide: jest.fn() };
});

const mockGetGuide = jest.mocked(getGuide);

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
    experienceYears: 6,
    experienceRange: null,
    routeMn: 'Хөвсгөл, Архангай',
    routeEn: 'Khövsgöl, Arkhangai',
    car: null,
    rating: null,
    reviewCount: null,
    aimags: [{ id: 9, slug: 'khuvsgul', nameMn: 'Хөвсгөл', nameEn: 'Khövsgöl' }],
    ...over,
  };
}

const params = (id: string) => Promise.resolve({ id });

beforeEach(() => {
  // jsdom implements neither, and <dialog> needs both to open — same stub ContactDialog.spec uses.
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => mockGetGuide.mockReset());

describe('generateMetadata', () => {
  it('titles the page after the guide', async () => {
    mockGetGuide.mockResolvedValue(guide({ id: 1 }));
    const meta = await generateMetadata({ params: params('1') });

    expect(meta.title).toBe('Б. Болормаа | АЯЛЪЯ ӨӨ');
    expect(meta.alternates?.canonical).toBe('/guides/1');
  });

  it('uses the bio when there is one', async () => {
    mockGetGuide.mockResolvedValue(guide({ id: 2, bioMn: 'Хөвсгөлийн хөтөч, 6 жилийн туршлагатай.' }));
    const meta = await generateMetadata({ params: params('2') });

    expect(meta.description).toBe('Хөвсгөлийн хөтөч, 6 жилийн туршлагатай.');
  });

  it('composes one from the coverage when there is not', async () => {
    // The 50 guides imported from the association's roster have no bio at all.
    mockGetGuide.mockResolvedValue(guide({ id: 3 }));
    const meta = await generateMetadata({ params: params('3') });

    expect(meta.description).toBe('Б. Болормаа — Хувь хөтөч. Ажилладаг аймгууд: Хөвсгөл.');
  });

  it('still composes one for a guide with no aimags either', async () => {
    mockGetGuide.mockResolvedValue(guide({ id: 4, aimags: [] }));
    const meta = await generateMetadata({ params: params('4') });

    expect(meta.description)
      .toBe('Б. Болормаа — Хувь хөтөч. АЯЛЪЯ ӨӨ-ийн баталгаажуулсан.');
  });

  it('shares an uploaded photo, absolute because it lives behind the API', async () => {
    mockGetGuide.mockResolvedValue(guide({ id: 5, photoUrl: '/api/images/guides/abc.jpg' }));
    const meta = await generateMetadata({ params: params('5') });

    expect(meta.openGraph?.images)
      .toEqual([{ url: 'http://localhost:4003/api/images/guides/abc.jpg', alt: 'Б. Болормаа' }]);
  });

  it('falls back to the site card for a guide with no photo', async () => {
    mockGetGuide.mockResolvedValue(guide({ id: 6 }));
    const meta = await generateMetadata({ params: params('6') });

    expect(meta.openGraph?.images).toEqual([{ url: '/og/hero1.jpg', alt: 'Б. Болормаа' }]);
  });

  it('reports a guide who is not approved exactly as one who does not exist', async () => {
    // The API hard-filters to approved, so pending and rejected both come back as 404 — and a
    // 404 here, not a 403, so the page cannot leak that the record exists.
    mockGetGuide.mockResolvedValue(null);
    const meta = await generateMetadata({ params: params('7') });

    expect(meta.title).toBe('Хуудас олдсонгүй | АЯЛЪЯ ӨӨ');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('does not ask the API about a non-numeric id', async () => {
    const meta = await generateMetadata({ params: params('abc') });

    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(mockGetGuide).not.toHaveBeenCalled();
  });
});

describe('toGuideView', () => {
  it('drops the phone, email, legal name and ratings before the client boundary', () => {
    const view = toGuideView(guide({ rating: 4.9, reviewCount: 12 }));

    // Not "is not rendered" — not present at all. GuideDetail is a client component, so anything
    // it receives is serialised into the page source whether it is drawn or not.
    for (const field of ['phone', 'email', 'fullName', 'createdAt', 'rating', 'reviewCount']) {
      expect(Object.hasOwn(view, field)).toBe(false);
    }
  });

  it('keeps everything the page actually shows', () => {
    const view = toGuideView(guide({ car: 'Delica', website: 'https://example.com' }));

    expect(view).toEqual({
      id: 11,
      type: 'individual',
      name: 'Б. Болормаа',
      bioMn: null,
      bioEn: null,
      languages: ['en', 'ko'],
      photoUrl: null,
      website: 'https://example.com',
      experienceYears: 6,
      experienceRange: null,
      routeMn: 'Хөвсгөл, Архангай',
      routeEn: 'Khövsgöl, Arkhangai',
      car: 'Delica',
      aimags: [{ id: 9, slug: 'khuvsgul', nameMn: 'Хөвсгөл', nameEn: 'Khövsgöl' }],
    });
  });
});

const switchTo = (lang: 'mn' | 'en') =>
  fireEvent.change(screen.getByLabelText('Хэл сонгох'), { target: { value: lang } });

describe('GuideDetail', () => {
  it('names the guide and badges their type', () => {
    render(<GuideDetail guide={toGuideView(guide())} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Б. Болормаа');
    expect(screen.getByText('Хувь хөтөч')).toBeTruthy();
  });

  it('prints a number of years as years, through the translator rule', () => {
    render(<GuideDetail guide={toGuideView(guide())} />);
    expect(screen.getByText('6 жил')).toBeTruthy();

    switchTo('en');
    expect(screen.getByText('6 years')).toBeTruthy();
  });

  it('prefers the association’s band over a number when the row has one', () => {
    render(<GuideDetail guide={toGuideView(guide({ experienceRange: '4-6 жил', experienceYears: null }))} />);

    expect(screen.getByText('4-6 жил')).toBeTruthy();
    switchTo('en');
    expect(screen.getByText('4–6 years')).toBeTruthy();
  });

  it('links each aimag they cover', () => {
    render(<GuideDetail guide={toGuideView(guide())} />);

    expect(screen.getByRole('link', { name: 'Хөвсгөл' }).getAttribute('href'))
      .toBe('/aimags/khuvsgul');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd'])(
    'refuses to link a %s website',
    (website) => {
      // The field is self-registered and Zod's .url() accepts all of these, so an unguarded
      // href here would be stored XSS on a page anyone can reach.
      render(<GuideDetail guide={toGuideView(guide({ website }))} />);

      expect(screen.queryByText('Вэб сайт')).toBeNull();
      expect(document.querySelector(`a[href="${website}"]`)).toBeNull();
    },
  );

  it('links a real website, normalised', () => {
    render(<GuideDetail guide={toGuideView(guide({ website: 'https://example.com' }))} />);

    expect(screen.getByRole('link', { name: 'https://example.com/' }).getAttribute('href'))
      .toBe('https://example.com/');
  });

  it('shows a car only for a driver', () => {
    render(<GuideDetail guide={toGuideView(guide({ type: 'driver', car: 'Land Cruiser 200' }))} />);
    expect(screen.getByText('Land Cruiser 200')).toBeTruthy();
  });

  it('offers the contact form rather than printing the contact details', () => {
    render(<GuideDetail guide={toGuideView(guide())} />);
    expect(screen.getByRole('button', { name: 'Холбогдох' })).toBeTruthy();
  });

  it('opens the contact dialog, attributed to this guide', () => {
    render(<GuideDetail guide={toGuideView(guide())} />);
    fireEvent.click(screen.getByRole('button', { name: 'Холбогдох' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Б. Болормаа-тай холбогдох' })).toBeTruthy();
  });

  it('carries its own title into English', () => {
    render(<GuideDetail guide={toGuideView(guide())} />);
    expect(document.title).toBe('Б. Болормаа | АЯЛЪЯ ӨӨ');

    switchTo('en');
    expect(document.title).toBe('Б. Болормаа | AYLAYOO');
  });
});
