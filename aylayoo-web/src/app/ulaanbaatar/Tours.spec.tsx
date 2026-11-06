import { render, screen, waitFor } from '@testing-library/react';
import { getCityTours, type CityTour } from '../../lib/api';
import { LangProvider } from '../../lib/i18n';
import { Tours, durationMn } from './Tours';

/* The tours tab.
 *
 * Two things are being guarded here, and the second is the one that broke production once
 * already: what a public tour card is allowed to say about a guide, and that an absent rating
 * renders rather than crashing. See docs/incidents.md incident 2, and the `!= null` note in
 * GuideCard.tsx.
 */

jest.mock('../../lib/api', () => ({
  ...jest.requireActual('../../lib/api'),
  getCityTours: jest.fn(),
}));

const mockTours = jest.mocked(getCityTours);

const tour = (over: Partial<CityTour> = {}): CityTour => ({
  id: 1,
  titleMn: 'Гандан хийдийн өглөө',
  titleEn: 'A morning at Gandan',
  summaryMn: 'Хийдийн өглөөний мөргөлөөр эхэлж, хуучин хотоор явган зугаална.',
  summaryEn: 'Start with the morning prayers, then walk the old town.',
  durationMinutes: 150,
  meetingPointMn: 'Гандан хийдийн гол хаалга',
  meetingPointEn: 'Gandan main gate',
  stops: [
    { placeMn: 'Гандан хийд', placeEn: 'Gandan Monastery', noteMn: null, noteEn: null, timeOfDay: 'morning', lat: null, lng: null },
  ],
  sortOrder: 0,
  guide: {
    id: 42,
    name: 'Б. Хишигбат',
    photoUrl: null,
    languages: ['Англи', 'Орос'],
    // No rating and no reviewCount: below the review floor the API omits both keys.
  },
  ...over,
});

const show = () => render(<LangProvider><Tours /></LangProvider>);

beforeEach(() => mockTours.mockResolvedValue([tour()]));
afterEach(() => jest.clearAllMocks());

describe('the tours list', () => {
  it('lists a tour with its guide and links to its page', async () => {
    show();

    expect(await screen.findByText('Гандан хийдийн өглөө')).toBeTruthy();
    expect(screen.getByText('Б. Хишигбат')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Гандан хийдийн өглөө' }).getAttribute('href'))
      .toBe('/ulaanbaatar/tours/1');
  });

  it('says so when nothing is published, rather than showing an empty grid', async () => {
    mockTours.mockResolvedValue([]);
    show();

    expect(await screen.findByText('Одоохондоо хөтөчтэй аялал нийтлээгүй байна.')).toBeTruthy();
  });

  it('renders a guide with no rating instead of crashing', async () => {
    /* The regression test for the bug that would have crashed every guide card in production:
     * the API OMITS `rating` below three published reviews, and `undefined !== null` is true,
     * so a strict check reaches `undefined.toFixed(1)`. */
    show();

    expect(await screen.findByText('Б. Хишигбат')).toBeTruthy();
    expect(screen.queryByText('★')).toBeNull();
  });

  it('shows the rating once the API sends one', async () => {
    mockTours.mockResolvedValue([
      tour({ guide: { ...tour().guide, rating: 4.8, reviewCount: 12 } }),
    ]);
    show();

    expect(await screen.findByText('4.8')).toBeTruthy();
    expect(screen.getByText('(12)')).toBeTruthy();
  });

  it('shows a rating with no count, which is a shape the API can produce', async () => {
    // Guards the inner `!= null` separately from the outer one.
    mockTours.mockResolvedValue([tour({ guide: { ...tour().guide, rating: 5 } })]);
    show();

    expect(await screen.findByText('5.0')).toBeTruthy();
    expect(screen.queryByText(/^\(\d+\)$/)).toBeNull();
  });

  it('never prints a guide’s phone number, email or legal name', async () => {
    /* The allow-list is enforced in the service, and the web type does not declare these
     * fields — but a card renders whatever it is handed, and this is the assertion that fails
     * if somebody widens either side. Incident 2 is what this costs. */
    const leaky = {
      ...tour().guide,
      phone: '99112233',
      email: 'guide@example.com',
      fullName: 'Батын Хишигбат',
    };
    mockTours.mockResolvedValue([tour({ guide: leaky as CityTour['guide'] })]);

    const { container } = show();
    await screen.findByText('Б. Хишигбат');

    for (const secret of ['99112233', 'guide@example.com', 'Батын Хишигбат']) {
      expect(container.innerHTML).not.toContain(secret);
    }
  });

  it('falls back to the stops when a tour has no summary', async () => {
    mockTours.mockResolvedValue([tour({ summaryMn: null, summaryEn: null })]);
    show();

    expect(await screen.findByText('Гандан хийд')).toBeTruthy();
  });

  it('offers a retry when the list fails to load', async () => {
    mockTours.mockRejectedValue(new Error('down'));
    show();

    await waitFor(() => expect(screen.getByRole('button', { name: /Дахин оролдох/ })).toBeTruthy());
  });
});

describe('durationMn', () => {
  it.each([
    [45, '45 мин'],
    [60, '1 цаг'],
    [90, '1 цаг 30 мин'],
    [150, '2 цаг 30 мин'],
    [180, '3 цаг'],
  ])('%i minutes reads as %s', (minutes, expected) => {
    expect(durationMn(minutes)).toBe(expected);
  });
});
