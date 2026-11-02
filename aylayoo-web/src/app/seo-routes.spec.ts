import type {
  Aimag, CityItinerary, CityRouteItem, Guide, Pagination, Place,
} from '../lib/api';
import { ApiError } from '../lib/api';
import {
  getAimags, getCityItineraries, getCityRoutes, getGuides, getPlaces,
} from '../lib/api-server';
import robots from './robots';
import sitemap from './sitemap';

/* /robots.txt and /sitemap.xml. The sitemap is the only thing that makes the detail pages
 * discoverable before anything links to them, so what it does when the API misbehaves matters as
 * much as what it lists when everything works. */

jest.mock('../lib/api-server', () => {
  const actual = jest.requireActual('../lib/api-server');
  return {
    ...actual,
    getAimags: jest.fn(),
    getPlaces: jest.fn(),
    getGuides: jest.fn(),
    getCityItineraries: jest.fn(),
    getCityRoutes: jest.fn(),
  };
});

const mockAimags = jest.mocked(getAimags);
const mockPlaces = jest.mocked(getPlaces);
const mockGuides = jest.mocked(getGuides);
const mockItineraries = jest.mocked(getCityItineraries);
const mockRoutes = jest.mocked(getCityRoutes);

const aimag = (slug: string): Aimag => ({
  id: 1, slug, nameMn: 'Аймаг', nameEn: 'Aimag', region: 'khangai',
  descriptionMn: null, descriptionEn: null, imageUrl: null,
  isoCode: null, centerMn: null, centerEn: null, areaKm2: null,
});

const place = (id: number, isMustSee = false): Place => ({
  id, aimagId: 1, nameMn: 'Газар', nameEn: 'Place', descriptionMn: null, descriptionEn: null,
  category: 'nature', lat: null, lng: null, images: [], isMustSee, imageKey: 'lake',
  bestMonthsMn: null, bestMonthsEn: null, mustTitleMn: null, mustTitleEn: null,
  mustSummaryMn: null, mustSummaryEn: null,
});

const guide = (id: number): Guide => ({
  id, type: 'individual', name: 'Хөтөч', bioMn: null, bioEn: null, languages: [], tripTypes: [],
  phone: '', email: '', photoUrl: null, website: null, createdAt: '', fullName: null,
  experienceYears: null, experienceRange: null, routeMn: null, routeEn: null, car: null,
  rating: null, reviewCount: null, aimags: [],
});

const itinerary = (id: number): CityItinerary => ({
  id, titleMn: 'Хөтөлбөр', titleEn: 'Itinerary', days: 1, summaryMn: null, summaryEn: null,
  stops: [], status: 'published', sortOrder: 0, createdAt: '',
});

const cityRoute = (id: number): CityRouteItem => ({
  id, titleMn: 'Маршрут', titleEn: 'Route', summaryMn: null, summaryEn: null,
  stops: [], status: 'published', sortOrder: 0, createdAt: '',
});

const page = (data: Guide[], totalPages: number): { data: Guide[]; pagination: Pagination } => ({
  data,
  pagination: { page: 1, limit: 50, total: totalPages * 50, totalPages },
});

beforeEach(() => {
  mockAimags.mockResolvedValue([aimag('khuvsgul')]);
  mockPlaces.mockResolvedValue([place(1)]);
  mockGuides.mockResolvedValue(page([guide(1)], 1));
  mockItineraries.mockResolvedValue([itinerary(7)]);
  mockRoutes.mockResolvedValue([cityRoute(9)]);
});

afterEach(() => jest.clearAllMocks());

describe('robots', () => {
  it('keeps crawlers out of /admin and points at the sitemap', () => {
    const txt = robots();

    expect(txt.rules).toEqual([{ userAgent: '*', allow: '/', disallow: '/admin' }]);
    expect(txt.sitemap).toBe('https://aylayoo.com/sitemap.xml');
    expect(txt.host).toBe('https://aylayoo.com');
  });
});

describe('sitemap', () => {
  it('lists the home page, every aimag, place, city page and guide', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual([
      'https://aylayoo.com/',
      'https://aylayoo.com/aimags/khuvsgul',
      'https://aylayoo.com/places/1',
      'https://aylayoo.com/ulaanbaatar',
      'https://aylayoo.com/ulaanbaatar/itineraries/7',
      'https://aylayoo.com/ulaanbaatar/routes/9',
      'https://aylayoo.com/guides/1',
    ]);
  });

  it('ranks the city section as highly as an aimag', async () => {
    // /ulaanbaatar is the page that leads to the itineraries and routes under it, the way an
    // aimag leads to its places.
    const entries = await sitemap();
    const priority = (url: string) => entries.find((e) => e.url.endsWith(url))?.priority;

    expect(priority('/ulaanbaatar')).toBe(priority('/aimags/khuvsgul'));
    expect(priority('/ulaanbaatar/itineraries/7')).toBeLessThan(
      priority('/ulaanbaatar') as number,
    );
  });

  it('still lists /ulaanbaatar when the city queries fail', async () => {
    // The section's landing page is worth serving even with nothing published under it.
    const down = () => Promise.reject(new ApiError('Сервертэй холбогдож чадсангүй'));
    mockItineraries.mockImplementation(down);
    mockRoutes.mockImplementation(down);

    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain('https://aylayoo.com/ulaanbaatar');
    expect(urls.some((url) => url.includes('/itineraries/'))).toBe(false);
    expect(urls.some((url) => url.includes('/ulaanbaatar/routes/'))).toBe(false);
  });

  it('uses absolute URLs, which a sitemap requires', async () => {
    for (const entry of await sitemap()) {
      expect(entry.url.startsWith('https://aylayoo.com/')).toBe(true);
    }
  });

  it('never lists /admin', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes('/admin'))).toBe(false);
  });

  it('ranks a must-see place above an ordinary one', async () => {
    mockPlaces.mockResolvedValue([place(1), place(2, true)]);
    const entries = await sitemap();

    const priority = (url: string) => entries.find((e) => e.url.endsWith(url))?.priority;
    expect(priority('/places/2')).toBeGreaterThan(priority('/places/1') as number);
  });

  it('walks past the API’s 50-guide cap rather than listing only the first page', async () => {
    // The API hard-caps limit at 50, so one request cannot return a 120-guide roster.
    mockGuides
      .mockResolvedValueOnce(page([guide(1)], 3))
      .mockResolvedValueOnce(page([guide(2)], 3))
      .mockResolvedValueOnce(page([guide(3)], 3));

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(mockGuides).toHaveBeenCalledTimes(3);
    expect(mockGuides).toHaveBeenNthCalledWith(2, 2);
    expect(urls).toContain('https://aylayoo.com/guides/2');
    expect(urls).toContain('https://aylayoo.com/guides/3');
  });

  it('still serves what it can when one query fails', async () => {
    // A crawler that gets a 500 here may back off from the whole site, so a partial sitemap
    // beats no sitemap.
    mockGuides.mockRejectedValue(new ApiError('Сервертэй холбогдож чадсангүй'));
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain('https://aylayoo.com/');
    expect(urls).toContain('https://aylayoo.com/aimags/khuvsgul');
    expect(urls.some((url) => url.includes('/guides/'))).toBe(false);
  });

  it('still serves the home page when the API is down entirely', async () => {
    const down = () => Promise.reject(new ApiError('Сервертэй холбогдож чадсангүй'));
    mockAimags.mockImplementation(down);
    mockPlaces.mockImplementation(down);
    mockGuides.mockImplementation(down);
    mockItineraries.mockImplementation(down);
    mockRoutes.mockImplementation(down);

    expect((await sitemap()).map((e) => e.url)).toEqual([
      'https://aylayoo.com/',
      // Static, so it survives every query failing — unlike everything else here.
      'https://aylayoo.com/ulaanbaatar',
    ]);
  });
});
