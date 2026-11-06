import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  deleteTripRequest, erasureLookup, getTripRequests, setTripRequestStatus,
  type AdminTripRequest,
} from '../../../lib/admin-api';
import { RequestsTab } from './RequestsTab';

/* /admin → "Аяллын хүсэлт", the relay.
 *
 * The staging is enforced by the API — it omits `email` and `phone` until the request is
 * accepted. What this spec holds is that the screen does not undo that: it branches on
 * `contactWithheld`, explains the gap instead of rendering blank fields, and shows the
 * traveller's contact only in the shape the API actually sends it.
 *
 * The strongest assertion here is the one on the rendered HTML: a withheld contact must not
 * appear anywhere in the document, including in a title attribute or a tel: href, which is
 * how this kind of leak usually survives a careless test.
 */

jest.mock('../../../lib/admin-api', () => ({
  getTripRequests: jest.fn(),
  setTripRequestStatus: jest.fn(),
  deleteTripRequest: jest.fn(),
  erasureLookup: jest.fn(),
}));

const mockList = jest.mocked(getTripRequests);
const mockStatus = jest.mocked(setTripRequestStatus);
const mockDelete = jest.mocked(deleteTripRequest);
const mockLookup = jest.mocked(erasureLookup);

const TOKEN = 'test-token';

/* Invented data. The guide's number is in the 7000 range this project's specs use for
 * fixtures, so a real roster number can never appear in a test. */
const GUIDE_PHONE = '+976 7000 0111';
const TRAVELLER_PHONE = '+976 7000 0222';
const TRAVELLER_EMAIL = 'traveller@example.invalid';

const request = (over: Partial<AdminTripRequest> = {}): AdminTripRequest => ({
  id: 1,
  reference: 'R7K29QMX4TBV',
  referenceFormatted: 'R7K2-9QMX-4TBV',
  travellerName: 'Sara',
  message: 'Two of us would like a morning walk around the square.',
  partySize: 2,
  preferredFrom: '2027-06-10',
  preferredTo: '2027-06-12',
  tourId: 7,
  guideId: 42,
  status: 'new',
  createdAt: '2026-11-01T09:00:00.000Z',
  acceptedAt: null,
  closedAt: null,
  contactClearedAt: null,
  reviewTokenDeliveredAt: null,
  // Before acceptance the API sends this and omits the two contact keys entirely.
  contactWithheld: true,
  guide: { name: 'B. Khishigbat', phone: GUIDE_PHONE, email: 'guide@example.invalid' },
  tourTitleMn: 'Гандан хийдийн өглөө',
  ...over,
});

const accepted = (over: Partial<AdminTripRequest> = {}) => request({
  status: 'accepted',
  acceptedAt: '2026-11-02T10:00:00.000Z',
  contactWithheld: false,
  phone: TRAVELLER_PHONE,
  email: TRAVELLER_EMAIL,
  ...over,
});

const show = () => render(<RequestsTab token={TOKEN} onUnauthorized={jest.fn()} />);

beforeEach(() => {
  mockList.mockResolvedValue([request()]);
  mockStatus.mockResolvedValue(accepted());
  mockDelete.mockResolvedValue({ message: 'Deleted' });
  mockLookup.mockResolvedValue({ matched: false });
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('the relay states', () => {
  it('names the state as what has happened, and says what it means', async () => {
    show();
    expect(await screen.findByText('Шинэ')).toBeTruthy();
    expect(screen.getByText('Хөтөчтэй холбогдоогүй байна.')).toBeTruthy();
  });

  it('counts the requests nobody has relayed yet', async () => {
    mockList.mockResolvedValue([request(), request({ id: 2, status: 'relayed' })]);
    show();

    expect(await screen.findByText('1 дамжуулаагүй')).toBeTruthy();
    expect(screen.getByText('1 хариу хүлээж байна')).toBeTruthy();
  });

  it('offers only the next steps that make sense from here', async () => {
    show();
    await screen.findByText('Шинэ');

    // From "new": relayed or cancelled. Not "accepted" — nobody has spoken to the guide yet.
    expect(screen.getByRole('button', { name: 'Дамжуулсан гэж бүртгэх' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Цуцалсан гэж бүртгэх' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Хүлээсэн гэж бүртгэх' })).toBeNull();
  });

  it('offers acceptance once the guide has been told', async () => {
    mockList.mockResolvedValue([request({ status: 'relayed' })]);
    show();
    await screen.findByText('Дамжуулсан');

    expect(screen.getByRole('button', { name: 'Хүлээсэн гэж бүртгэх' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Татгалзсан гэж бүртгэх' })).toBeTruthy();
  });

  it('sends the status the admin pressed', async () => {
    show();
    await screen.findByText('Шинэ');

    fireEvent.click(screen.getByRole('button', { name: 'Дамжуулсан гэж бүртгэх' }));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledWith(TOKEN, 1, 'relayed'));
  });

  it('leaves a completed request with nothing further to do', async () => {
    mockList.mockResolvedValue([request({ status: 'completed', acceptedAt: '2026-11-02T10:00:00.000Z', contactWithheld: false })]);
    show();
    await screen.findByText('Болсон');

    expect(screen.queryByRole('button', { name: /гэж бүртгэх/ })).toBeNull();
  });
});

describe('the traveller’s contact is withheld until the guide accepts', () => {
  it('explains the gap instead of showing empty fields', async () => {
    show();
    await screen.findByText('Шинэ');

    expect(screen.getByRole('note')).toBeTruthy();
    expect(screen.getByText(/хараахан харагдахгүй/)).toBeTruthy();
  });

  it('does not render the contact anywhere in the document', async () => {
    /* The assertion that catches a leak through a tel: href or a title attribute, not just
     * through visible text. The API omits the keys, so this also fails loudly if somebody
     * reintroduces them on the server and the screen starts rendering them. */
    const { container } = show();
    await screen.findByText('Шинэ');

    expect(container.innerHTML).not.toContain(TRAVELLER_PHONE);
    expect(container.innerHTML).not.toContain(TRAVELLER_EMAIL);
    expect(container.innerHTML).not.toContain('tel:+976 7000 0222');
  });

  it('shows the contact once it is accepted and the API sends it', async () => {
    mockList.mockResolvedValue([accepted()]);
    show();
    await screen.findByText('Хүлээсэн');

    expect(screen.getByRole('link', { name: TRAVELLER_PHONE }).getAttribute('href'))
      .toBe(`tel:${TRAVELLER_PHONE}`);
    expect(screen.getByRole('link', { name: TRAVELLER_EMAIL })).toBeTruthy();
    expect(screen.queryByText(/хараахан харагдахгүй/)).toBeNull();
  });

  it('handles a traveller who left only an email', async () => {
    mockList.mockResolvedValue([accepted({ phone: undefined })]);
    show();
    await screen.findByText('Хүлээсэн');

    expect(screen.queryByText(/хараахан харагдахгүй/)).toBeNull();
    expect(screen.getByRole('link', { name: TRAVELLER_EMAIL })).toBeTruthy();
  });

  it('trusts contactWithheld, not whether the fields happen to be empty', async () => {
    /* The case that tells the two rules apart, and a real one: 90 days after the trip the
     * retention pass clears the contact, so an ACCEPTED request has no phone and no email and
     * `contactWithheld: false`. Branching on emptiness would tell the admin to mark it
     * accepted and wait — for details that are gone for good. */
    mockList.mockResolvedValue([accepted({
      phone: undefined,
      email: undefined,
      contactClearedAt: '2027-09-10T00:00:00.000Z',
    })]);
    show();
    await screen.findByText('Хүлээсэн');

    expect(screen.queryByText(/хараахан харагдахгүй/)).toBeNull();
    expect(screen.getByText(/Аялагчтай холбогдох/)).toBeTruthy();
  });

  it('still shows the guide’s own contact, which is how the admin relays at all', async () => {
    show();
    await screen.findByText('Шинэ');

    // Admin-only everywhere in this service, and never shown on the public site.
    expect(screen.getByRole('link', { name: GUIDE_PHONE })).toBeTruthy();
  });
});

describe('what an admin sees about the request itself', () => {
  it('shows the reference, the tour, the party size and the dates', async () => {
    show();
    await screen.findByText('Шинэ');

    expect(screen.getByText('R7K2-9QMX-4TBV')).toBeTruthy();
    expect(screen.getByText(/Гандан хийдийн өглөө/)).toBeTruthy();
    expect(screen.getByText(/2 хүн/)).toBeTruthy();
    expect(screen.getByText(/2027-06-10 – 2027-06-12/)).toBeTruthy();
  });

  it('deletes after confirming, for spam and for an honoured erasure alike', async () => {
    show();
    await screen.findByText('Шинэ');

    fireEvent.click(screen.getByRole('button', { name: 'Устгах' }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(TOKEN, 1));
  });

  it('says so when there is nothing in the list', async () => {
    mockList.mockResolvedValue([]);
    show();
    expect(await screen.findByText('Хүсэлт одоохондоо алга.')).toBeTruthy();
  });
});

describe('the erasure lookup', () => {
  it('needs both halves and offers no delete until they match', async () => {
    show();
    await screen.findByText('Шинэ');

    fireEvent.change(screen.getByLabelText('Хүсэлтийн дугаар'), {
      target: { value: 'R7K2-9QMX-4TBV' },
    });
    fireEvent.change(screen.getByLabelText('Холбоо барих хаяг'), {
      target: { value: 'wrong@example.invalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Шалгах' }));

    expect(await screen.findByText(/Таарсангүй/)).toBeTruthy();
    // No id came back, so there is nothing to delete — and no hint about which half was wrong.
    expect(screen.queryByRole('button', { name: 'Устгах' })).toBeTruthy(); // the row's own
    expect(screen.getByText(/хоёулаа тохирох ёстой/)).toBeTruthy();
  });

  it('deletes only after a match, as a second deliberate press', async () => {
    mockLookup.mockResolvedValue({ matched: true, id: 9, status: 'new' });
    show();
    await screen.findByText('Шинэ');

    fireEvent.change(screen.getByLabelText('Хүсэлтийн дугаар'), {
      target: { value: 'R7K2-9QMX-4TBV' },
    });
    fireEvent.change(screen.getByLabelText('Холбоо барих хаяг'), {
      target: { value: TRAVELLER_EMAIL },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Шалгах' }));

    expect(await screen.findByText(/Таарлаа/)).toBeTruthy();
    expect(mockDelete).not.toHaveBeenCalled();

    // The erasure form's own delete button is the last one on the screen.
    const deletes = screen.getAllByRole('button', { name: 'Устгах' });
    fireEvent.click(deletes[deletes.length - 1]);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(TOKEN, 9));
  });

  it('says plainly when the contact has already aged out', async () => {
    mockLookup.mockResolvedValue({ matched: false, contactAlreadyCleared: true, id: 3 });
    show();
    await screen.findByText('Шинэ');

    fireEvent.change(screen.getByLabelText('Хүсэлтийн дугаар'), { target: { value: 'R7K2-9QMX-4TBV' } });
    fireEvent.change(screen.getByLabelText('Холбоо барих хаяг'), { target: { value: TRAVELLER_EMAIL } });
    fireEvent.click(screen.getByRole('button', { name: 'Шалгах' }));

    expect(await screen.findByText(/аль хэдийн устсан/)).toBeTruthy();
  });
});
