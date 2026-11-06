import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '../../lib/api';
import {
  adminLogin, getAdminGuides, getMessages, setGuideAssignment, setGuideStatus,
  type AdminGuide, type ContactMessage,
} from '../../lib/admin-api';
import { getAimags, type Aimag } from '../../lib/api';
import AdminPage from './page';

jest.mock('../../lib/admin-api', () => {
  const actual = jest.requireActual('../../lib/admin-api');
  return {
    ...actual,
    adminLogin: jest.fn(),
    getAdminGuides: jest.fn(),
    setGuideStatus: jest.fn(),
    setGuideAssignment: jest.fn(),
    getMessages: jest.fn(),
  };
});

jest.mock('../../lib/api', () => {
  const actual = jest.requireActual('../../lib/api');
  return { ...actual, getAimags: jest.fn() };
});

// jest.mock above is hoisted, so these imports are already the mocks.
const api = {
  adminLogin: jest.mocked(adminLogin),
  getAdminGuides: jest.mocked(getAdminGuides),
  setGuideStatus: jest.mocked(setGuideStatus),
  getMessages: jest.mocked(getMessages),
  setGuideAssignment: jest.mocked(setGuideAssignment),
  getAimags: jest.mocked(getAimags),
};


/* The admin screen is the only place that can change what the public site shows, so the things
 * pinned here are: the token never outlives the tab, an expired one signs out instead of
 * erroring, and approving one registration cannot silently approve another. */

const guide = (over: Partial<AdminGuide> & Pick<AdminGuide, 'id' | 'name'>): AdminGuide => ({
  type: 'individual', status: 'pending', bioMn: null, bioEn: null,
  languages: ['mn', 'en'], tripTypes: ['countryside'], phone: '+976 99110001',
  email: 'a@example.com', photoUrl: null, website: null, createdAt: '2026-09-26T18:16:43.000Z',
  fullName: null, experienceYears: 6, experienceRange: null,
  routeMn: 'Хөвсгөл', routeEn: 'Khövsgöl', car: null,
  rating: null, reviewCount: null,
  aimags: [{ id: 1, slug: 'khuvsgul', nameMn: 'Хөвсгөл', nameEn: 'Khövsgöl' }],
  ...over,
});

const BOLORMAA = guide({ id: 1, name: 'Б. Болормаа' });
const DRIVER = guide({
  id: 2, name: 'Т. Мөнх', type: 'driver', car: 'Land Cruiser 200',
  phone: '+976 88110002', email: 'driver@example.com',
  aimags: [
    { id: 1, slug: 'khuvsgul', nameMn: 'Хөвсгөл', nameEn: 'Khövsgöl' },
    { id: 2, slug: 'arkhangai', nameMn: 'Архангай', nameEn: 'Arkhangai' },
  ],
});

const MESSAGES: ContactMessage[] = [
  {
    id: 9, name: 'Сарнай', email: null, phone: '+976 99112233',
    message: 'Хоёр хүн,\n7 сард', createdAt: '2026-09-26T18:17:23.000Z', guideId: null,
    subject: 'Манзуширын хийд', kind: 'booking',
  },
  {
    id: 8, name: 'Bat', email: 'bat@example.com', phone: null,
    message: 'Interested in a Gobi trip', createdAt: '2026-09-26T18:17:22.000Z', guideId: 1,
    subject: 'Б. Болормаа', kind: 'contact',
  },
];

const aimag = (id: number, slug: string, nameMn: string): Aimag => ({
  id, slug, nameMn, nameEn: slug, region: 'khangai', descriptionMn: null, descriptionEn: null,
  imageUrl: null, isoCode: null, centerMn: null, centerEn: null, areaKm2: null,
});

const AIMAGS = [aimag(1, 'khuvsgul', 'Хөвсгөл'), aimag(2, 'arkhangai', 'Архангай')];

/* A guide as the tourism association's roster provides them: languages and an experience
 * band, but no aimags and no trip types, because the roster does not record those. */
const ROSTER_GUIDE = guide({
  id: 7, name: 'Ж. Содномпил', status: 'approved',
  fullName: 'Жаргал Содномпил', languages: ['en', 'ko'],
  experienceYears: null, experienceRange: '4-6 жил',
  routeMn: null, routeEn: null, tripTypes: [], aimags: [],
});

async function signIn() {
  api.adminLogin.mockResolvedValue('tok-123');
  render(<AdminPage />);
  // The stored token is read in an effect, so the login form appears after a tick.
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Админ нэвтрэх' })).toBeTruthy());

  fireEvent.change(document.querySelector('input[name="email"]') as HTMLInputElement, {
    target: { value: 'admin@example.com' },
  });
  fireEvent.change(document.querySelector('input[name="password"]') as HTMLInputElement, {
    target: { value: 'secret' },
  });
  await act(async () => {
    fireEvent.submit(document.querySelector('form.dlg') as HTMLFormElement);
  });
}

beforeEach(() => {
  // Named individually: the module also re-exports real values (ADMIN_TYPE_LABEL), which
  // have no mockReset.
  for (const mock of [
    api.adminLogin, api.getAdminGuides, api.setGuideStatus, api.getMessages,
    api.setGuideAssignment, api.getAimags,
  ]) {
    mock.mockReset();
  }
  api.getAimags.mockResolvedValue(AIMAGS);
  api.setGuideAssignment.mockImplementation(async (_t, _id, input) => ({
    ...ROSTER_GUIDE,
    tripTypes: input.tripTypes ?? ROSTER_GUIDE.tripTypes,
    aimags: AIMAGS.filter((a) => (input.aimagIds ?? []).includes(a.id))
      .map(({ id, slug, nameMn, nameEn }) => ({ id, slug, nameMn, nameEn })),
  }));
  api.getAdminGuides.mockResolvedValue([BOLORMAA, DRIVER]);
  api.getMessages.mockResolvedValue(MESSAGES);
  api.setGuideStatus.mockResolvedValue({ data: { id: 1, status: 'approved' } });
  sessionStorage.clear();
});

describe('signing in', () => {
  it('asks for credentials first, and shows nothing else', async () => {
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Админ нэвтрэх' })).toBeTruthy());
    expect(screen.queryByRole('tab', { name: /Мессежүүд/ })).toBeNull();
    expect(api.getAdminGuides).not.toHaveBeenCalled();
  });

  it('sends what was typed, and opens the dashboard', async () => {
    await signIn();
    expect(api.adminLogin).toHaveBeenCalledWith('admin@example.com', 'secret');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Гарах' })).toBeTruthy());
  });

  it('reports a rejected sign-in with the API\'s own words', async () => {
    // "wrong password" and "too many attempts" have to be distinguishable to whoever is locked
    // out, and the API caps login at 10 an hour.
    api.adminLogin.mockRejectedValue(new ApiError('Too many requests. Please try again later.'));
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Админ нэвтрэх' })).toBeTruthy());

    fireEvent.change(document.querySelector('input[name="email"]') as HTMLInputElement, {
      target: { value: 'a@b.c' },
    });
    fireEvent.change(document.querySelector('input[name="password"]') as HTMLInputElement, {
      target: { value: 'x' },
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('form.dlg') as HTMLFormElement);
    });

    expect(screen.getByRole('alert').textContent).toContain('Too many requests');
    // Still on the login screen.
    expect(screen.queryByRole('button', { name: 'Гарах' })).toBeNull();
  });
});

describe('where the token lives', () => {
  it('keeps it in sessionStorage, not localStorage', async () => {
    await signIn();
    // sessionStorage dies with the tab; localStorage would leave an 8-hour token behind on a
    // shared machine.
    expect(sessionStorage.getItem('aylayoo-admin-token')).toBe('tok-123');
    expect(localStorage.getItem('aylayoo-admin-token')).toBeNull();
  });

  it('stays signed in across a reload of the same tab', async () => {
    sessionStorage.setItem('aylayoo-admin-token', 'tok-123');
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Гарах' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Админ нэвтрэх' })).toBeNull();
  });

  it('forgets it on logout', async () => {
    await signIn();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Гарах' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Гарах' }));
    expect(sessionStorage.getItem('aylayoo-admin-token')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Админ нэвтрэх' })).toBeTruthy();
  });

  it('signs out rather than erroring when the token has expired', async () => {
    // An 8-hour token cannot be rescued by retrying, so a 401 means start again.
    api.setGuideStatus.mockRejectedValue(new ApiError('Unauthorized', 401));
    await signIn();
    await waitFor(() => expect(screen.getByText('Б. Болормаа')).toBeTruthy());

    const card = screen.getByText('Б. Болормаа').closest('.admin-card') as HTMLElement;
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Баталгаажуулах' }));
    });

    expect(screen.getByRole('heading', { name: 'Админ нэвтрэх' })).toBeTruthy();
    expect(sessionStorage.getItem('aylayoo-admin-token')).toBeNull();
  });
});

describe('pending registrations', () => {
  it('asks for the pending ones with the token', async () => {
    await signIn();
    await waitFor(() => expect(api.getAdminGuides).toHaveBeenCalledWith('tok-123', 'pending'));
  });

  it('shows everything a reviewer needs to decide', async () => {
    await signIn();
    await waitFor(() => expect(screen.getByText('Б. Болормаа')).toBeTruthy());

    const card = screen.getByText('Б. Болормаа').closest('.admin-card') as HTMLElement;
    expect(card.textContent).toContain('Хувь хөтөч');       // type
    expect(card.textContent).toContain('+976 99110001');     // phone
    expect(card.textContent).toContain('a@example.com');     // email
    expect(card.textContent).toContain('Хөвсгөл');           // aimags
    expect(card.textContent).toContain('Монгол, Англи');     // languages
    expect(card.textContent).toContain('6 жил');             // experience
  });

  it('shows a driver\'s vehicle in place of languages, and all their aimags', async () => {
    await signIn();
    await waitFor(() => expect(screen.getByText('Т. Мөнх')).toBeTruthy());

    const card = screen.getByText('Т. Мөнх').closest('.admin-card') as HTMLElement;
    expect(card.textContent).toContain('Land Cruiser 200');
    expect(card.textContent).toContain('Хөвсгөл, Архангай');
    expect(within(card).queryByText('Хэл')).toBeNull();
  });

  it('shows an uploaded photo when there is one', async () => {
    api.getAdminGuides.mockResolvedValue([guide({ id: 3, name: 'Зурагтай', photoUrl: '/api/images/guides/x.jpg' })]);
    await signIn();
    await waitFor(() => expect(screen.getByText('Зурагтай')).toBeTruthy());
    expect(document.querySelector('.admin-card img')?.getAttribute('src')).toContain('/api/images/guides/x.jpg');
  });

  it('approves exactly the one that was clicked', async () => {
    await signIn();
    await waitFor(() => expect(screen.getByText('Т. Мөнх')).toBeTruthy());

    const card = screen.getByText('Т. Мөнх').closest('.admin-card') as HTMLElement;
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Баталгаажуулах' }));
    });

    expect(api.setGuideStatus).toHaveBeenCalledTimes(1);
    expect(api.setGuideStatus).toHaveBeenCalledWith('tok-123', 2, 'approved');
    // The other card is untouched and still decidable.
    const other = screen.getByText('Б. Болормаа').closest('.admin-card') as HTMLElement;
    expect(within(other).getByRole('button', { name: 'Баталгаажуулах' })).toBeTruthy();
  });

  it('rejects when asked to reject', async () => {
    await signIn();
    await waitFor(() => expect(screen.getByText('Б. Болормаа')).toBeTruthy());

    const card = screen.getByText('Б. Болормаа').closest('.admin-card') as HTMLElement;
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Татгалзах' }));
    });
    expect(api.setGuideStatus).toHaveBeenCalledWith('tok-123', 1, 'rejected');
  });

  it('keeps a decided card on screen, showing what was done', async () => {
    // Vanishing would leave no way to notice an approval you did not mean.
    await signIn();
    await waitFor(() => expect(screen.getByText('Б. Болормаа')).toBeTruthy());

    const card = screen.getByText('Б. Болормаа').closest('.admin-card') as HTMLElement;
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Баталгаажуулах' }));
    });

    expect(within(card).getByText('Баталгаажлаа')).toBeTruthy();
    expect(within(card).queryByRole('button', { name: 'Баталгаажуулах' })).toBeNull();
    expect(card.classList.contains('done')).toBe(true);
  });

  it('counts only the ones still waiting', async () => {
    await signIn();
    await waitFor(() => expect(screen.getByText('2 хүсэлт хүлээгдэж байна')).toBeTruthy());

    const card = screen.getByText('Б. Болормаа').closest('.admin-card') as HTMLElement;
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Баталгаажуулах' }));
    });
    expect(screen.getByText('1 хүсэлт хүлээгдэж байна')).toBeTruthy();
  });

  it('explains a failed decision without losing the card', async () => {
    api.setGuideStatus.mockRejectedValue(new ApiError('Guide not found', 404));
    await signIn();
    await waitFor(() => expect(screen.getByText('Б. Болормаа')).toBeTruthy());

    const card = screen.getByText('Б. Болормаа').closest('.admin-card') as HTMLElement;
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Баталгаажуулах' }));
    });

    expect(screen.getByRole('alert').textContent).toContain('Guide not found');
    // Still pending, still decidable — a 404 is not a rejection.
    expect(within(card).getByRole('button', { name: 'Баталгаажуулах' })).toBeTruthy();
  });

  it('says so when the queue is empty', async () => {
    api.getAdminGuides.mockResolvedValue([]);
    await signIn();
    await waitFor(() => expect(screen.getByText('Хүлээгдэж байгаа бүртгэл одоохондоо алга.')).toBeTruthy());
  });

  it('offers a retry when the list fails to load', async () => {
    api.getAdminGuides.mockRejectedValue(new ApiError('Сервертэй холбогдож чадсангүй'));
    await signIn();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Дахин оролдох' })).toBeTruthy());

    api.getAdminGuides.mockResolvedValue([BOLORMAA]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Дахин оролдох' }));
    });
    expect(screen.getByText('Б. Болормаа')).toBeTruthy();
  });
});

describe('messages', () => {
  const openMessages = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Мессежүүд' }));
    });
  };

  it('only loads them once that tab is opened', async () => {
    await signIn();
    await waitFor(() => expect(screen.getByText('Б. Болормаа')).toBeTruthy());
    expect(api.getMessages).not.toHaveBeenCalled();

    await openMessages();
    expect(api.getMessages).toHaveBeenCalledWith('tok-123');
  });

  it('lists them newest first, as the API returns them', async () => {
    await signIn();
    await openMessages();

    const names = [...document.querySelectorAll('.admin-message-top b')].map((el) => el.textContent);
    expect(names).toEqual(['Сарнай', 'Bat']);
  });

  it('distinguishes a booking from an enquiry', async () => {
    await signIn();
    await openMessages();

    const rows = [...document.querySelectorAll('.admin-message')];
    expect(within(rows[0] as HTMLElement).getByText('Захиалга')).toBeTruthy();
    expect(within(rows[1] as HTMLElement).getByText('Холбогдох')).toBeTruthy();
  });

  it('shows whichever way each person asked to be reached', async () => {
    await signIn();
    await openMessages();

    const rows = [...document.querySelectorAll('.admin-message')] as HTMLElement[];
    expect(within(rows[0]).getByText('+976 99112233').getAttribute('href')).toBe('tel:+976 99112233');
    expect(within(rows[1]).getByText('bat@example.com').getAttribute('href')).toBe('mailto:bat@example.com');
  });

  it('shows the subject and the message itself', async () => {
    await signIn();
    await openMessages();

    expect(screen.getByText('Манзуширын хийд')).toBeTruthy();
    expect(screen.getByText('Interested in a Gobi trip')).toBeTruthy();
    // Line breaks are preserved, so a list of dates does not run together.
    expect(document.querySelector('.admin-body')?.textContent).toContain('\n');
  });

  it('says so when the inbox is empty', async () => {
    api.getMessages.mockResolvedValue([]);
    await signIn();
    await openMessages();
    expect(screen.getByText('Мессеж одоохондоо алга.')).toBeTruthy();
  });
});


describe('approved guides', () => {
  const openApproved = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Баталгаажсан хөтчүүд' }));
    });
  };

  const card = () => screen.getByText('Ж. Содномпил').closest('.admin-card') as HTMLElement;

  beforeEach(() => {
    // The pending tab loads first; the approved tab asks for a different status.
    api.getAdminGuides.mockImplementation(async (_token, status) =>
      (status === 'approved' ? [ROSTER_GUIDE] : []));
  });

  it('asks for the approved ones only when that tab is opened', async () => {
    await signIn();
    await waitFor(() => expect(api.getAdminGuides).toHaveBeenCalledWith('tok-123', 'pending'));
    expect(api.getAdminGuides).not.toHaveBeenCalledWith('tok-123', 'approved');

    await openApproved();
    expect(api.getAdminGuides).toHaveBeenCalledWith('tok-123', 'approved');
  });

  it('shows what the roster has and marks what it does not', async () => {
    await signIn();
    await openApproved();

    expect(card().textContent).toContain('Англи, Солонгос');
    expect(card().textContent).toContain('4-6 жил');
    // The roster has no aimags or trip types, and that is called out rather than left blank.
    expect(within(card()).getAllByText('заагаагүй')).toHaveLength(2);
  });

  it('counts the guides the map cannot recommend yet', async () => {
    // A guide with no aimag shows in the carousel but can never be recommended by the map.
    await signIn();
    await openApproved();
    expect(screen.getByText('1 хөтөчид аймаг заагаагүй')).toBeTruthy();
  });

  it('leaves out rows it has nothing for', async () => {
    await signIn();
    await openApproved();
    expect(card().textContent).not.toContain('Машин');
    expect(card().textContent).not.toContain('Чиглэл');
  });

  it('assigns aimags and trip types', async () => {
    await signIn();
    await openApproved();

    fireEvent.click(within(card()).getByRole('button', { name: 'Аймаг & төрөл засах' }));
    fireEvent.click(within(card()).getByRole('button', { name: 'Хөвсгөл' }));
    fireEvent.click(within(card()).getByRole('button', { name: 'Хөдөөгийн аялал' }));
    await act(async () => {
      fireEvent.click(within(card()).getByRole('button', { name: 'Хадгалах' }));
    });

    expect(api.setGuideAssignment).toHaveBeenCalledWith('tok-123', 7, {
      aimagIds: [1],
      tripTypes: ['countryside'],
    });
  });

  it('sends the full set, so unticking an aimag removes it', async () => {
    api.getAdminGuides.mockImplementation(async (_t, status) => (status === 'approved'
      ? [{ ...ROSTER_GUIDE, aimags: [{ id: 1, slug: 'khuvsgul', nameMn: 'Хөвсгөл', nameEn: 'khuvsgul' }] }]
      : []));
    await signIn();
    await openApproved();

    fireEvent.click(within(card()).getByRole('button', { name: 'Аймаг & төрөл засах' }));
    // Starts ticked, because the guide already has it.
    expect(within(card()).getByRole('button', { name: 'Хөвсгөл' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(card()).getByRole('button', { name: 'Хөвсгөл' }));
    await act(async () => {
      fireEvent.click(within(card()).getByRole('button', { name: 'Хадгалах' }));
    });

    expect(api.setGuideAssignment).toHaveBeenCalledWith('tok-123', 7, {
      aimagIds: [],
      tripTypes: [],
    });
  });

  it('cancels without saving', async () => {
    await signIn();
    await openApproved();

    fireEvent.click(within(card()).getByRole('button', { name: 'Аймаг & төрөл засах' }));
    fireEvent.click(within(card()).getByRole('button', { name: 'Хөвсгөл' }));
    fireEvent.click(within(card()).getByRole('button', { name: 'Болих' }));

    expect(api.setGuideAssignment).not.toHaveBeenCalled();
    // And reopening does not remember the abandoned tick.
    fireEvent.click(within(card()).getByRole('button', { name: 'Аймаг & төрөл засах' }));
    expect(within(card()).getByRole('button', { name: 'Хөвсгөл' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the editor open and explains a failed save', async () => {
    api.setGuideAssignment.mockRejectedValue(new ApiError('One or more aimags do not exist'));
    await signIn();
    await openApproved();

    fireEvent.click(within(card()).getByRole('button', { name: 'Аймаг & төрөл засах' }));
    await act(async () => {
      fireEvent.click(within(card()).getByRole('button', { name: 'Хадгалах' }));
    });

    expect(within(card()).getByRole('alert').textContent).toContain('do not exist');
    expect(within(card()).getByRole('button', { name: 'Хадгалах' })).toBeTruthy();
  });

  it('signs out when the token has expired', async () => {
    api.setGuideAssignment.mockRejectedValue(new ApiError('Unauthorized', 401));
    await signIn();
    await openApproved();

    fireEvent.click(within(card()).getByRole('button', { name: 'Аймаг & төрөл засах' }));
    await act(async () => {
      fireEvent.click(within(card()).getByRole('button', { name: 'Хадгалах' }));
    });

    expect(screen.getByRole('heading', { name: 'Админ нэвтрэх' })).toBeTruthy();
  });
});
