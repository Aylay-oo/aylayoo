import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '../../../lib/api';
import {
  createTour, deleteTour, getAdminGuides, getAdminTours, getGuideConsent, recordGuideConsent,
  revokeGuideConsent, updateTour, type AdminGuide, type AdminTour, type GuideConsent,
} from '../../../lib/admin-api';
import { ToursTab } from './ToursTab';

/* /admin → "Хөтөчтэй аялал": the tours, and the consent that governs them.
 *
 * The consent gate is enforced in the service — admin-tours.ts answers 409 on a publish
 * without it. What this spec holds is that the screen says so BEFORE the click, that it never
 * blocks UNPUBLISHING, and that revoking reports how many tours it took down, because that is
 * the consequence an admin is least likely to expect.
 */

jest.mock('../../../lib/admin-api', () => ({
  getAdminTours: jest.fn(),
  createTour: jest.fn(),
  updateTour: jest.fn(),
  deleteTour: jest.fn(),
  getAdminGuides: jest.fn(),
  getGuideConsent: jest.fn(),
  recordGuideConsent: jest.fn(),
  revokeGuideConsent: jest.fn(),
}));

const mockTours = jest.mocked(getAdminTours);
const mockCreate = jest.mocked(createTour);
const mockUpdate = jest.mocked(updateTour);
const mockDelete = jest.mocked(deleteTour);
const mockGuides = jest.mocked(getAdminGuides);
const mockConsent = jest.mocked(getGuideConsent);
const mockRecord = jest.mocked(recordGuideConsent);
const mockRevoke = jest.mocked(revokeGuideConsent);

const TOKEN = 'test-token';

const guide = (over: Partial<AdminGuide> = {}): AdminGuide => ({
  id: 42,
  type: 'individual',
  name: 'B. Khishigbat',
  status: 'approved',
  // Invented, and in the 7000 range this project's fixtures use.
  phone: '+976 7000 0111',
  email: 'guide@example.invalid',
  fullName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  bioMn: null, bioEn: null, languages: [], tripTypes: [], photoUrl: null, website: null,
  experienceYears: null, experienceRange: null, routeMn: null, routeEn: null, car: null,
  rating: null, reviewCount: null, aimags: [],
  ...over,
});

const tour = (over: Partial<AdminTour> = {}): AdminTour => ({
  id: 1,
  titleMn: 'Гандан хийдийн өглөө',
  titleEn: 'A morning at Gandan',
  summaryMn: null,
  summaryEn: null,
  guideId: 42,
  durationMinutes: 150,
  meetingPointMn: null,
  meetingPointEn: null,
  stops: [],
  status: 'draft',
  sortOrder: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  guideName: 'B. Khishigbat',
  guideStatus: 'approved',
  guideConsentScopes: [],
  ...over,
});

const consentRow = (over: Partial<GuideConsent> = {}): GuideConsent => ({
  id: 5,
  guideId: 42,
  scope: 'tours',
  source: 'guide',
  recordedByAdminId: 1,
  evidenceNote: 'Phoned on 2026-11-04 and agreed to tours.',
  recordedAt: '2026-11-04T00:00:00.000Z',
  revokedAt: null,
  ...over,
});

const show = () => render(<ToursTab token={TOKEN} onUnauthorized={jest.fn()} />);

const publishButton = () =>
  screen.getByRole('button', { name: 'Нийтлэх' }) as HTMLButtonElement;

const openConsent = async () => {
  show();
  await screen.findByText('Гандан хийдийн өглөө');
  fireEvent.click(screen.getByRole('tab', { name: 'Хөтчийн зөвшөөрөл' }));
  /* The guide list is fetched by this panel on mount, and selecting an <option> that is not
   * in the DOM yet silently leaves the select empty — which looked like a validation bug. */
  await screen.findByRole('option', { name: 'B. Khishigbat (#42)' });
};

beforeEach(() => {
  mockTours.mockResolvedValue([tour()]);
  mockGuides.mockResolvedValue([guide()]);
  mockConsent.mockResolvedValue([consentRow()]);
  mockUpdate.mockResolvedValue(tour());
  mockCreate.mockResolvedValue(tour());
  mockDelete.mockResolvedValue({ message: 'Deleted' });
  mockRevoke.mockResolvedValue({ id: 5, scope: 'tours', toursUnpublished: 2 });
  mockRecord.mockResolvedValue(consentRow());
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('publishing is blocked until the guide has consented', () => {
  it('disables the button and says which consent is missing', async () => {
    show();
    await screen.findByText('Гандан хийдийн өглөө');

    expect(screen.getByText(/аялал нийтлэх зөвшөөрөл өгөөгүй/)).toBeTruthy();
    expect(publishButton().disabled).toBe(true);
  });

  it('allows it once the consent is on the row', async () => {
    mockTours.mockResolvedValue([tour({ guideConsentScopes: ['tours'] })]);
    show();
    await screen.findByText('Гандан хийдийн өглөө');

    expect(publishButton().disabled).toBe(false);

    fireEvent.click(publishButton());
    await waitFor(() => expect(mockUpdate)
      .toHaveBeenCalledWith(TOKEN, 1, { status: 'published' }));
  });

  it('is not satisfied by consent for something else', async () => {
    // `requests` consent is not `tours` consent — the service checks the scope, and so does this.
    mockTours.mockResolvedValue([tour({ guideConsentScopes: ['requests', 'reviews'] })]);
    show();
    await screen.findByText('Гандан хийдийн өглөө');

    expect(publishButton().disabled).toBe(true);
  });

  it('blocks a guide who is not approved, and says that instead', async () => {
    mockTours.mockResolvedValue([
      tour({ guideStatus: 'pending', guideConsentScopes: ['tours'] }),
    ]);
    show();
    await screen.findByText('Гандан хийдийн өглөө');

    expect(screen.getByText(/төлөвт байна/)).toBeTruthy();
    expect(publishButton().disabled).toBe(true);
  });

  it('never blocks taking a published tour down', async () => {
    /* The asymmetry that matters: if consent is revoked out from under a published tour, the
     * admin must still be able to unpublish it. Blocking both directions with one check is the
     * easy mistake here. */
    mockTours.mockResolvedValue([tour({ status: 'published', guideConsentScopes: [] })]);
    show();
    await screen.findByText('Гандан хийдийн өглөө');

    const unpublish = screen.getByRole('button', { name: 'Нийтлэхээ болих' }) as HTMLButtonElement;
    expect(unpublish.disabled).toBe(false);

    fireEvent.click(unpublish);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(TOKEN, 1, { status: 'draft' }));
  });

  it('shows the server’s 409 if the two ever disagree', async () => {
    mockTours.mockResolvedValue([tour({ guideConsentScopes: ['tours'] })]);
    mockUpdate.mockRejectedValue(new ApiError('That guide has not consented to tours', 409));
    show();
    await screen.findByText('Гандан хийдийн өглөө');

    fireEvent.click(publishButton());
    expect((await screen.findByRole('alert')).textContent).toContain('has not consented');
  });
});

describe('the tour form', () => {
  it('offers only approved guides', async () => {
    show();
    await screen.findByText('Гандан хийдийн өглөө');
    fireEvent.click(screen.getByRole('button', { name: '+ Шинэ аялал' }));

    expect(mockGuides).toHaveBeenCalledWith(TOKEN, 'approved');
    expect(screen.getByRole('option', { name: 'B. Khishigbat (#42)' })).toBeTruthy();
  });

  it('refuses to save without a guide', async () => {
    show();
    await screen.findByText('Гандан хийдийн өглөө');
    fireEvent.click(screen.getByRole('button', { name: '+ Шинэ аялал' }));

    fireEvent.change(screen.getByLabelText('Нэр (MN)'), { target: { value: 'Шинэ аялал' } });
    fireEvent.change(screen.getByLabelText('Нэр (EN)'), { target: { value: 'New tour' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Хадгалах' }).closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toContain('Хөтөч сонгоно уу.');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('sends a new tour with its guide and an empty duration as null', async () => {
    show();
    await screen.findByText('Гандан хийдийн өглөө');
    fireEvent.click(screen.getByRole('button', { name: '+ Шинэ аялал' }));

    fireEvent.change(screen.getByLabelText('Нэр (MN)'), { target: { value: 'Шинэ аялал' } });
    fireEvent.change(screen.getByLabelText('Нэр (EN)'), { target: { value: 'New tour' } });
    fireEvent.change(screen.getByLabelText(/^Хөтөч/), { target: { value: '42' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Хадгалах' }).closest('form')!);

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][1]).toMatchObject({
      titleMn: 'Шинэ аялал', titleEn: 'New tour', guideId: 42, durationMinutes: null,
    });
  });

  it('never sends status, so a save cannot slip past the consent check', async () => {
    show();
    await screen.findByText('Гандан хийдийн өглөө');
    fireEvent.click(screen.getByRole('button', { name: 'Засах' }));

    fireEvent.change(screen.getByLabelText('Нэр (MN)'), { target: { value: 'Өөр нэр' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Хадгалах' }).closest('form')!);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty('status');
  });

  it('sends only what changed, so a PUT cannot clear a column somebody else set', async () => {
    show();
    await screen.findByText('Гандан хийдийн өглөө');
    fireEvent.click(screen.getByRole('button', { name: 'Засах' }));

    fireEvent.change(screen.getByLabelText('Нэр (MN)'), { target: { value: 'Өөр нэр' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Хадгалах' }).closest('form')!);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][2]).toEqual({ titleMn: 'Өөр нэр' });
  });
});

describe('recording consent', () => {
  it('insists on evidence before it will send anything', async () => {
    await openConsent();

    fireEvent.change(screen.getByLabelText(/^Хөтөч/), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText(/^Хэрхэн авсан/), { target: { value: 'ok' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Бүртгэх' }).closest('form')!);

    // Unevidenced consent is not consent — the API's floor is 8 characters, said here first.
    expect((await screen.findByRole('alert')).textContent).toContain('хамгийн багадаа 8 тэмдэгт');
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('sends the scope, the source and the note', async () => {
    await openConsent();

    fireEvent.change(screen.getByLabelText(/^Хөтөч/), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText(/^Хэнээс/), { target: { value: 'association' } });
    fireEvent.change(screen.getByLabelText(/^Хэрхэн авсан/), {
      target: { value: 'Холбооны 2026-11-04-ны захидлаар.' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Бүртгэх' }).closest('form')!);

    await waitFor(() => expect(mockRecord).toHaveBeenCalledWith(TOKEN, {
      guideId: 42,
      scope: 'tours',
      source: 'association',
      evidenceNote: 'Холбооны 2026-11-04-ны захидлаар.',
    }));
  });

  it('shows the evidence on the row, because it is the answer to "how do we know?"', async () => {
    await openConsent();
    expect(await screen.findByText('Phoned on 2026-11-04 and agreed to tours.')).toBeTruthy();
  });
});

describe('revoking consent', () => {
  it('reports how many tours it took down', async () => {
    await openConsent();
    await screen.findByText('Phoned on 2026-11-04 and agreed to tours.');

    fireEvent.click(screen.getByRole('button', { name: 'Цуцлах' }));

    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith(TOKEN, 5));
    expect(await screen.findByText(/2 аялал нийтлэгдэхээ больсон/)).toBeTruthy();
  });

  it('warns about the unpublishing before doing it', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await openConsent();
    await screen.findByText('Phoned on 2026-11-04 and agreed to tours.');

    fireEvent.click(screen.getByRole('button', { name: 'Цуцлах' }));

    expect(confirm.mock.calls[0][0]).toMatch(/нийтлэгдэхээ болино/);
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('keeps a revoked consent on the list as history rather than deleting it', async () => {
    mockConsent.mockResolvedValue([consentRow({ revokedAt: '2026-11-05T00:00:00.000Z' })]);
    await openConsent();

    expect(await screen.findByText(/Цуцалсан/)).toBeTruthy();
    // Nothing further to revoke, but the row and its evidence are still readable.
    expect(screen.queryByRole('button', { name: 'Цуцлах' })).toBeNull();
    expect(screen.getByText('Phoned on 2026-11-04 and agreed to tours.')).toBeTruthy();
  });
});
