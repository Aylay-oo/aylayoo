import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  ApiError, getCityEvents, getCityFood, getCityItineraries, getCityRoutes, getCityTips,
  getCityTours, getPhrases, type CityEvent, type CityItinerary, type CityRouteItem, type CityTip,
  type Phrase,
} from '../../lib/api';
import { UlaanbaatarPage } from './UlaanbaatarPage';

/* /ulaanbaatar.
 *
 * The page the team's city content actually reaches visitors through, so what is checked here
 * is what the brief turns on: that each tab asks the API for its own data and only its own,
 * that a failure empties one tab rather than the page, and that the two tabs which ship empty
 * say something useful rather than nothing.
 */

jest.mock('../../lib/api', () => {
  const actual = jest.requireActual('../../lib/api');
  return {
    ...actual,
    getCityItineraries: jest.fn(),
    getCityRoutes: jest.fn(),
    getCityFood: jest.fn(),
    getCityTips: jest.fn(),
    getPhrases: jest.fn(),
    getCityEvents: jest.fn(),
    getCityTours: jest.fn(),
  };
});

const mockItineraries = jest.mocked(getCityItineraries);
const mockRoutes = jest.mocked(getCityRoutes);
const mockFood = jest.mocked(getCityFood);
const mockTips = jest.mocked(getCityTips);
const mockPhrases = jest.mocked(getPhrases);
const mockEvents = jest.mocked(getCityEvents);
const mockTours = jest.mocked(getCityTours);

const TITLES = { mn: 'Улаанбаатар', en: 'Ulaanbaatar' };

const itinerary = (over: Partial<CityItinerary> = {}): CityItinerary => ({
  id: 1,
  titleMn: 'Нэг өдрийн Улаанбаатар',
  titleEn: 'One day in Ulaanbaatar',
  days: 1,
  summaryMn: 'Нэг өдрийн маршрут',
  summaryEn: 'A one-day route',
  stops: [],
  status: 'published',
  sortOrder: 0,
  createdAt: '',
  ...over,
});

const cityRoute = (over: Partial<CityRouteItem> = {}): CityRouteItem => ({
  id: 5,
  titleMn: 'Буддын Улаанбаатар',
  titleEn: 'Buddhist Ulaanbaatar',
  summaryMn: null,
  summaryEn: null,
  stops: [],
  status: 'published',
  sortOrder: 0,
  createdAt: '',
  ...over,
});

const tip = (over: Partial<CityTip> = {}): CityTip => ({
  id: 3,
  topic: 'transport',
  titleMn: 'Автобусны карт',
  titleEn: 'The bus card',
  bodyMn: 'Урьдчилж цэнэглэнэ.',
  bodyEn: 'Topped up in advance.',
  status: 'published',
  sortOrder: 0,
  createdAt: '',
  ...over,
});

const phrase = (over: Partial<Phrase> = {}): Phrase => ({
  id: 4,
  phraseMn: 'Баярлалаа',
  pronunciation: 'Bayarlalaa',
  meaningEn: 'Thank you',
  category: 'basics',
  status: 'published',
  sortOrder: 0,
  ...over,
});

const event = (over: Partial<CityEvent> = {}): CityEvent => ({
  id: 6,
  titleMn: 'Наадам',
  titleEn: 'Naadam',
  startDate: '2026-11-03',
  endDate: null,
  placeMn: 'Сүхбаатарын талбай',
  placeEn: 'Sukhbaatar Square',
  descriptionMn: null,
  descriptionEn: null,
  link: null,
  status: 'published',
  sortOrder: 0,
  createdAt: '',
  ...over,
});

beforeEach(() => {
  mockItineraries.mockResolvedValue([itinerary()]);
  mockRoutes.mockResolvedValue([cityRoute()]);
  mockFood.mockResolvedValue([]);
  mockTips.mockResolvedValue([tip()]);
  mockPhrases.mockResolvedValue([phrase()]);
  mockEvents.mockResolvedValue([]);
  // Nothing published, which is production's actual state on the day R1a shipped.
  mockTours.mockResolvedValue([]);
  window.location.hash = '';
});

afterEach(() => jest.clearAllMocks());

const open = () => render(<UlaanbaatarPage titles={TITLES} />);
const tab = (name: RegExp) => screen.getByRole('tab', { name });

/* Switching a tab mounts a panel that immediately fetches, so the click has to be wrapped and
 * the request allowed to settle — otherwise the state update lands after the test has ended
 * and React says so. */
const click = (element: HTMLElement) => act(() => { fireEvent.click(element); });

describe('/ulaanbaatar', () => {
  it('opens on the itineraries and fetches only that tab', async () => {
    open();
    expect(await screen.findByText('Нэг өдрийн Улаанбаатар')).toBeTruthy();

    // Mounting all six panels would fire six requests to show one.
    expect(mockItineraries).toHaveBeenCalled();
    expect(mockRoutes).not.toHaveBeenCalled();
    expect(mockFood).not.toHaveBeenCalled();
    expect(mockPhrases).not.toHaveBeenCalled();
  });

  it('reports which tab is selected', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');

    expect(tab(/Аяллын хөтөлбөр/).getAttribute('aria-selected')).toBe('true');
    expect(tab(/Явган маршрут/).getAttribute('aria-selected')).toBe('false');

    click(tab(/Явган маршрут/));
    expect(tab(/Явган маршрут/).getAttribute('aria-selected')).toBe('true');
    expect(tab(/Аяллын хөтөлбөр/).getAttribute('aria-selected')).toBe('false');

    // Let the panel's own fetch land before the test ends.
    expect(await screen.findByText('Буддын Улаанбаатар')).toBeTruthy();
  });

  it('loads a tab the first time it is opened', async () => {
    open();
    click(tab(/Хэллэг/));
    expect(await screen.findByText('Баярлалаа')).toBeTruthy();
    expect(screen.getByText('Bayarlalaa')).toBeTruthy();
    // The phrasebook shows all three parts whatever the language — see Phrasebook.tsx.
    expect(screen.getByText('Thank you')).toBeTruthy();
  });

  it('asks the API to filter by day count rather than filtering in the browser', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    expect(mockItineraries).toHaveBeenLastCalledWith(undefined);

    click(screen.getByRole('tab', { name: '2 өдөр' }));
    await waitFor(() => expect(mockItineraries).toHaveBeenLastCalledWith(2));
  });

  it('groups the practical guide under its topic heading', async () => {
    mockTips.mockResolvedValue([tip(), tip({ id: 9, topic: 'etiquette', titleMn: 'Гэрт орохдоо' })]);
    open();
    click(tab(/Хэрэгтэй мэдээлэл/));

    expect(await screen.findByText('Хотоор зорчих')).toBeTruthy();
    expect(screen.getByText('Зан заншил')).toBeTruthy();
  });

  it('still shows a tip whose topic this build does not know', async () => {
    // A published row must never be invisible, even if the enum has moved on.
    mockTips.mockResolvedValue([tip({ topic: 'nightlife' as CityTip['topic'] })]);
    open();
    click(tab(/Хэрэгтэй мэдээлэл/));

    expect(await screen.findByText('Бусад')).toBeTruthy();
    expect(screen.getByText('Автобусны карт')).toBeTruthy();
  });

  it('explains the empty food tab rather than just showing nothing', async () => {
    open();
    click(tab(/Хоол, ресторан/));
    expect(await screen.findByText('Хоолны газруудыг бэлтгэж байна.')).toBeTruthy();
  });

  it('explains the empty events tab', async () => {
    open();
    click(tab(/Арга хэмжээ/));
    expect(await screen.findByText('Энэ долоо хоногт нийтэлсэн арга хэмжээ байхгүй.')).toBeTruthy();
  });

  it('separates events on this week from later ones', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
    mockEvents.mockResolvedValue([
      event({ id: 1, titleMn: 'Энэ долоо хоногийн', startDate: soon }),
      event({ id: 2, titleMn: 'Хожим', startDate: later }),
    ]);

    open();
    click(tab(/Арга хэмжээ/));

    expect(await screen.findByText('Энэ долоо хоногт')).toBeTruthy();
    expect(screen.getByText('Дараагийн арга хэмжээнүүд')).toBeTruthy();
    expect(screen.getByText('Энэ долоо хоногийн')).toBeTruthy();
    expect(today <= soon).toBe(true);
  });

  it('refuses to link an event to a javascript: URL', async () => {
    /* The API rejects one now, so this is about rows stored before that rule and anything
     * written to the database by hand — on a page that also carries no admin token, but the
     * same component shape is what guards the ones that do. */
    mockEvents.mockResolvedValue([event({ link: 'javascript:alert(1)' })]);
    open();
    click(tab(/Арга хэмжээ/));

    await screen.findByText('Наадам');
    expect(screen.queryByRole('link', { name: 'Дэлгэрэнгүй мэдээлэл' })).toBeNull();
  });

  it('links an http(s) event URL', async () => {
    mockEvents.mockResolvedValue([event({ link: 'https://example.com/naadam' })]);
    open();
    click(tab(/Арга хэмжээ/));

    const link = await screen.findByRole('link', { name: 'Дэлгэрэнгүй мэдээлэл' });
    expect(link.getAttribute('href')).toBe('https://example.com/naadam');
    // target="_blank" without this hands the new tab a handle on window.opener.
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('offers a retry when one tab fails, and leaves the others alone', async () => {
    mockRoutes.mockRejectedValueOnce(new ApiError('Сервертэй холбогдож чадсангүй'));
    open();
    click(tab(/Явган маршрут/));

    expect(await screen.findByText('Сервертэй холбогдож чадсангүй')).toBeTruthy();
    // The tab bar is still there, so nothing about the page is stuck.
    expect(tab(/Хэллэг/)).toBeTruthy();

    mockRoutes.mockResolvedValue([cityRoute()]);
    click(screen.getByRole('button', { name: 'Дахин оролдох' }));
    expect(await screen.findByText('Буддын Улаанбаатар')).toBeTruthy();
  });

  it('links each itinerary and route to its own page', async () => {
    open();
    const link = await screen.findByRole('link', { name: 'Нэг өдрийн Улаанбаатар' });
    expect(link.getAttribute('href')).toBe('/ulaanbaatar/itineraries/1');

    click(tab(/Явган маршрут/));
    const routeLink = await screen.findByRole('link', { name: 'Буддын Улаанбаатар' });
    expect(routeLink.getAttribute('href')).toBe('/ulaanbaatar/routes/5');
  });

  it('names a route by its stops when it has no summary', async () => {
    // Better than an empty card, and more useful than a count of them.
    mockRoutes.mockResolvedValue([cityRoute({
      stops: [
        {
          placeMn: 'Гандан', placeEn: 'Gandan', timeOfDay: null,
          noteMn: null, noteEn: null, lat: null, lng: null,
        },
        {
          placeMn: 'Чойжин', placeEn: 'Choijin', timeOfDay: null,
          noteMn: null, noteEn: null, lat: null, lng: null,
        },
      ],
    })]);
    open();
    click(tab(/Явган маршрут/));

    expect(await screen.findByText('Гандан → Чойжин')).toBeTruthy();
  });

  /* ---------------------------------------------------------------------------
   * Deep links — what makes the section reachable from the home page
   * ------------------------------------------------------------------------- */

  it('opens the tours tab when arriving at #tours', async () => {
    window.location.hash = '#tours';
    open();

    expect(tab(/Хөтөчтэй аялал/).getAttribute('aria-selected')).toBe('true');
    expect(tab(/Аяллын хөтөлбөр/).getAttribute('aria-selected')).toBe('false');

    await waitFor(() => expect(mockTours).toHaveBeenCalled());

    /* The deep link still must not mount all seven panels: the five tabs nobody asked for
     * never fetch. */
    expect(mockRoutes).not.toHaveBeenCalled();
    expect(mockFood).not.toHaveBeenCalled();
    expect(mockTips).not.toHaveBeenCalled();
    expect(mockPhrases).not.toHaveBeenCalled();
    expect(mockEvents).not.toHaveBeenCalled();

    /* The default tab does fetch once, and that is accepted rather than optimised away. The
     * hash is read in an effect, so the first render is still the default tab — which is the
     * point: this page is statically prerendered, and deciding the tab during the first render
     * would make the client disagree with the server HTML whenever a hash was present. One
     * spare request is a better trade than a hydration mismatch. */
    expect(mockItineraries).toHaveBeenCalledTimes(1);
  });

  it('still works when no tours are published — the empty state, not an error', async () => {
    /* The case that matters on the day this shipped: consent gates publishing, so the tab is
     * legitimately empty. A home-page link that lands on a blank panel or a stack trace would
     * be worse than no link at all. */
    window.location.hash = '#tours';
    open();

    expect(await screen.findByText('Одоохондоо хөтөчтэй аялал нийтлээгүй байна.')).toBeTruthy();
    expect(tab(/Хөтөчтэй аялал/).getAttribute('aria-selected')).toBe('true');
  });

  it('ignores a hash that names no tab, rather than showing nothing', async () => {
    window.location.hash = '#not-a-tab';
    open();

    // Falls back to the default tab, so a stale or hand-typed link still gives a usable page.
    expect(tab(/Аяллын хөтөлбөр/).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByText('Нэг өдрийн Улаанбаатар')).toBeTruthy();
  });

  it('follows a hash change without a remount', async () => {
    /* Clicking a #tours link while already on this page does not remount the component, so the
     * mount-time read alone would silently do nothing. */
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');

    await act(async () => {
      window.location.hash = '#phrases';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(tab(/Хэллэг/).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByText('Баярлалаа')).toBeTruthy();
  });

  it('gives every tab an accessible name and every panel a label', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');

    for (const control of screen.getAllByRole('tab')) {
      expect(control.textContent?.trim()).toBeTruthy();
    }
    expect(screen.getByRole('tabpanel').getAttribute('aria-label')).toBe('Аяллын хөтөлбөр');
  });
});
