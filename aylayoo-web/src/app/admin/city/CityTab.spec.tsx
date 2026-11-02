import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '../../../lib/api';
import {
  createCityRow, deleteCityRow, getAdminCity, reorderCity, setCityStatus, updateCityRow,
  type AdminCityRow,
} from '../../../lib/admin-api';
import { CityTab } from './CityTab';

/* /admin → "Хот".
 *
 * The screen that decides what the public city section shows, so it gets the same depth as
 * admin/page.spec.tsx. What matters here is that a write goes to the right resource with the
 * right payload, that publishing does not take anything else with it, and that a reorder sends
 * the whole list rather than the pair that moved.
 */

jest.mock('../../../lib/admin-api', () => ({
  getAdminCity: jest.fn(),
  createCityRow: jest.fn(),
  updateCityRow: jest.fn(),
  deleteCityRow: jest.fn(),
  setCityStatus: jest.fn(),
  reorderCity: jest.fn(),
}));

const mockList = jest.mocked(getAdminCity);
const mockCreate = jest.mocked(createCityRow);
const mockUpdate = jest.mocked(updateCityRow);
const mockDelete = jest.mocked(deleteCityRow);
const mockStatus = jest.mocked(setCityStatus);
const mockReorder = jest.mocked(reorderCity);

const TOKEN = 'test-token';

const itinerary = (over: Partial<AdminCityRow> = {}): AdminCityRow => ({
  id: 1,
  status: 'draft',
  sortOrder: 0,
  titleMn: 'Нэг өдрийн Улаанбаатар',
  titleEn: 'One day in Ulaanbaatar',
  days: 1,
  summaryMn: null,
  summaryEn: null,
  stops: [],
  ...over,
});

const phrase = (over: Partial<AdminCityRow> = {}): AdminCityRow => ({
  id: 50,
  status: 'published',
  sortOrder: 0,
  phraseMn: 'Баярлалаа',
  pronunciation: 'Bayarlalaa',
  meaningEn: 'Thank you',
  category: 'basics',
  ...over,
});

const onUnauthorized = jest.fn();

beforeEach(() => {
  mockList.mockResolvedValue([itinerary()]);
  mockCreate.mockResolvedValue(itinerary({ id: 2 }));
  mockUpdate.mockResolvedValue(itinerary());
  mockStatus.mockResolvedValue(itinerary({ status: 'published' }));
  mockDelete.mockResolvedValue({ message: 'Deleted' });
  mockReorder.mockResolvedValue({ data: { ids: [] } });
});

afterEach(() => jest.clearAllMocks());

const open = () => render(<CityTab token={TOKEN} onUnauthorized={onUnauthorized} />);
const click = (element: HTMLElement) => act(() => { fireEvent.click(element); });
const type = (label: RegExp, value: string) => act(() => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
});

describe('the Хот tab', () => {
  it('opens on the itineraries and loads only that resource', async () => {
    open();
    expect(await screen.findByText('Нэг өдрийн Улаанбаатар')).toBeTruthy();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith(TOKEN, 'itineraries');
  });

  it('refetches when the sub-tab changes, rather than reusing the last rows', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');

    mockList.mockResolvedValue([phrase()]);
    click(screen.getByRole('tab', { name: 'Хэллэг' }));

    expect(await screen.findByText('Баярлалаа')).toBeTruthy();
    expect(mockList).toHaveBeenLastCalledWith(TOKEN, 'phrases');
  });

  it('shows a draft as such, and counts the drafts', async () => {
    mockList.mockResolvedValue([itinerary(), itinerary({ id: 2, status: 'published' })]);
    open();

    expect(await screen.findByText('Нооруулга')).toBeTruthy();
    expect(screen.getByText('Нийтэлсэн')).toBeTruthy();
    // The number worth acting on: the rows nobody can see yet.
    expect(screen.getByText('1 нооруулга')).toBeTruthy();
  });

  it('publishes a row without touching anything else about it', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Нийтлэх' }));

    await waitFor(() => expect(mockStatus).toHaveBeenCalledWith(TOKEN, 'itineraries', 1, 'published'));
    // setCityStatus sends only { status }, so a publish cannot empty the stops.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('unpublishes a published row', async () => {
    mockList.mockResolvedValue([itinerary({ status: 'published' })]);
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Нийтлэхээ болих' }));

    await waitFor(() => expect(mockStatus).toHaveBeenCalledWith(TOKEN, 'itineraries', 1, 'draft'));
  });

  it('sends the whole list in its new order when a row moves', async () => {
    mockList.mockResolvedValue([
      itinerary({ id: 11 }), itinerary({ id: 22 }), itinerary({ id: 33 }),
    ]);
    open();
    await screen.findAllByText('Нэг өдрийн Улаанбаатар');

    // The first row's "down" button swaps it with the second.
    click(screen.getAllByRole('button', { name: /доош/ })[0]);
    await waitFor(() => expect(mockReorder).toHaveBeenCalledWith(TOKEN, 'itineraries', [22, 11, 33]));
  });

  it('cannot move the first row up or the last row down', async () => {
    mockList.mockResolvedValue([itinerary({ id: 11 }), itinerary({ id: 22 })]);
    open();
    await screen.findAllByText('Нэг өдрийн Улаанбаатар');

    expect(screen.getAllByRole('button', { name: /дээш/ })[0].hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByRole('button', { name: /доош/ })[1].hasAttribute('disabled')).toBe(true);
  });

  it('creates a row from the form, and the API decides it is a draft', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: /Шинэ хөтөлбөр/ }));

    type(/Нэр \(MN\)/, 'Шинэ хөтөлбөр');
    type(/Нэр \(EN\)/, 'New itinerary');
    type(/Хоногийн тоо/, '2');
    click(screen.getByRole('button', { name: 'Хадгалах' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(TOKEN, 'itineraries', {
      titleMn: 'Шинэ хөтөлбөр',
      titleEn: 'New itinerary',
      // A select over numeric options is coerced, so `days` is not sent as a string.
      days: 2,
      stops: [],
    }));
    // No `status` in the payload: a new row is a draft because the column says so.
    expect(mockCreate.mock.calls[0][2]).not.toHaveProperty('status');
  });

  it('refuses to send a form with a required field empty', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: /Шинэ хөтөлбөр/ }));
    click(screen.getByRole('button', { name: 'Хадгалах' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('clears a field that is emptied on an edit, rather than keeping the old value', async () => {
    mockList.mockResolvedValue([itinerary({ summaryMn: 'Хуучин тайлбар' })]);
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Засах' }));

    type(/Тайлбар \(MN\)/, '');
    click(screen.getByRole('button', { name: 'Хадгалах' }));

    /* An absent field is left alone by the API, so clearing one has to send an explicit
     * null — otherwise the old text would silently stay. */
    await waitFor(() => {
      expect(mockUpdate.mock.calls[0][3]).toMatchObject({ summaryMn: null });
    });
  });

  it('refuses a stop with only half a coordinate before sending it', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: /Шинэ хөтөлбөр/ }));

    type(/Нэр \(MN\)/, 'Тест');
    type(/Нэр \(EN\)/, 'Test');
    type(/Хоногийн тоо/, '1');
    click(screen.getByRole('button', { name: /Зогсоол нэмэх/ }));

    type(/Газрын нэр \(MN\)/, 'Гандан');
    type(/Газрын нэр \(EN\)/, 'Gandan');
    act(() => {
      fireEvent.blur(screen.getByLabelText(/Өргөрөг/), { target: { value: '47.92' } });
    });
    click(screen.getByRole('button', { name: 'Хадгалах' }));

    expect((await screen.findByRole('alert')).textContent).toContain('уртраг');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('refuses a coordinate outside Ulaanbaatar', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: /Шинэ хөтөлбөр/ }));

    type(/Нэр \(MN\)/, 'Тест');
    type(/Нэр \(EN\)/, 'Test');
    type(/Хоногийн тоо/, '1');
    click(screen.getByRole('button', { name: /Зогсоол нэмэх/ }));
    type(/Газрын нэр \(MN\)/, 'Хөвсгөл');
    type(/Газрын нэр \(EN\)/, 'Khuvsgul');
    act(() => {
      fireEvent.blur(screen.getByLabelText(/Өргөрөг/), { target: { value: '51.0' } });
      fireEvent.blur(screen.getByLabelText(/Уртраг/), { target: { value: '100.5' } });
    });
    click(screen.getByRole('button', { name: 'Хадгалах' }));

    expect((await screen.findByRole('alert')).textContent).toContain('өргөрөг');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('reorders the stops within a row', async () => {
    mockList.mockResolvedValue([itinerary({
      stops: [
        { placeMn: 'Гандан', placeEn: 'Gandan', timeOfDay: null, noteMn: null, noteEn: null, lat: null, lng: null },
        { placeMn: 'Зайсан', placeEn: 'Zaisan', timeOfDay: null, noteMn: null, noteEn: null, lat: null, lng: null },
      ],
    })]);
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Засах' }));

    click(screen.getByRole('button', { name: '2-р зогсоолыг дээш' }));
    click(screen.getByRole('button', { name: 'Хадгалах' }));

    await waitFor(() => {
      const stops = mockUpdate.mock.calls[0][3].stops as { placeMn: string }[];
      expect(stops.map((stop) => stop.placeMn)).toEqual(['Зайсан', 'Гандан']);
    });
  });

  it('asks before deleting, and does nothing if the answer is no', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Устгах' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('deletes when confirmed', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Устгах' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(TOKEN, 'itineraries', 1));
    confirmSpy.mockRestore();
  });

  it('signs out on a 401 instead of showing an error', async () => {
    // An expired token cannot be recovered from by retrying.
    mockStatus.mockRejectedValueOnce(new ApiError('Invalid or expired token', 401));
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Нийтлэх' }));

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the API’s own message when a write is rejected', async () => {
    mockStatus.mockRejectedValueOnce(new ApiError('The link must be an http or https address', 400));
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');
    click(screen.getByRole('button', { name: 'Нийтлэх' }));

    expect((await screen.findByRole('alert')).textContent)
      .toContain('The link must be an http or https address');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('offers a retry when the list itself fails to load', async () => {
    mockList.mockRejectedValueOnce(new ApiError('Сервертэй холбогдож чадсангүй'));
    open();

    expect(await screen.findByText('Сервертэй холбогдож чадсангүй')).toBeTruthy();
    mockList.mockResolvedValue([itinerary()]);
    click(screen.getByRole('button', { name: 'Дахин оролдох' }));
    expect(await screen.findByText('Нэг өдрийн Улаанбаатар')).toBeTruthy();
  });

  it('says so when a resource has no rows — as food and events start out', async () => {
    mockList.mockResolvedValue([]);
    open();
    click(screen.getByRole('tab', { name: 'Хоол' }));

    expect(await screen.findByText(/бичлэг байхгүй/)).toBeTruthy();
  });

  it('gives every sub-tab and every control an accessible name', async () => {
    open();
    await screen.findByText('Нэг өдрийн Улаанбаатар');

    for (const element of [...screen.getAllByRole('tab'), ...screen.getAllByRole('button')]) {
      const name = element.getAttribute('aria-label') || element.textContent?.trim();
      expect(name).toBeTruthy();
    }
  });
});
