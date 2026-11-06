import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError, sendTripRequest } from '../../lib/api';
import { LangProvider, useLang } from '../../lib/i18n';
import { TripRequestDialog } from './TripRequestDialog';

/* The traveller's request form.
 *
 * The only place on the public site that collects somebody's phone number, so the assertions
 * here are mostly about restraint: the notice is present before they submit, the message
 * refuses contact details, the confirmation promises what the system can actually do, and the
 * reference is shown because it is the only handle they will ever have.
 */

jest.mock('../../lib/api', () => ({
  ...jest.requireActual('../../lib/api'),
  sendTripRequest: jest.fn(),
}));

const mockSend = jest.mocked(sendTripRequest);

/* jsdom implements <dialog> but not showModal in older versions; stub both so the component's
 * open/close effect runs the same way it does in a browser. */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});

function Switch({ to }: { to: 'mn' | 'en' }) {
  const { setLang } = useLang();
  return <button type="button" onClick={() => setLang(to)}>switch</button>;
}

const show = (lang: 'mn' | 'en' = 'mn') => {
  const result = render(
    <LangProvider>
      <Switch to={lang} />
      <TripRequestDialog open onClose={jest.fn()} tourId={7} tourTitle="Гандан хийдийн өглөө" />
    </LangProvider>,
  );
  // The provider starts in Mongolian; rendering the switch is not enough, it has to be clicked.
  if (lang === 'en') {
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'switch' })); });
  }
  return result;
};

/** Fills in the three required fields with a message that breaks no rule. */
function fill(message = 'Хоёр хүн, хотын төвөөр явган аялахыг хүсэж байна.') {
  fireEvent.change(screen.getByLabelText('Нэр'), { target: { value: 'Сараа' } });
  fireEvent.change(screen.getByLabelText('Утас эсвэл имэйл'), {
    target: { value: 'saraa@example.invalid' },
  });
  fireEvent.change(screen.getByLabelText('Аяллын тухай'), { target: { value: message } });
}

const submit = () => fireEvent.submit(screen.getByRole('button', { name: 'Хүсэлт илгээх' }).closest('form')!);

beforeEach(() => {
  mockSend.mockResolvedValue({ data: { reference: 'R7K29QMX4TBV' }, message: 'Request received.' });
});
afterEach(() => jest.clearAllMocks());

describe('the privacy notice', () => {
  it('is on the form, before anything is sent', () => {
    show();
    expect(screen.getByText('Таны мэдээллийн талаар')).toBeTruthy();
    expect(screen.getByText(/90 хоногийн дараа устгана/)).toBeTruthy();
  });

  it('names the staging the service enforces', () => {
    show();
    // admin-trips.ts withholds the contact until acceptedAt is set; the notice says so.
    expect(screen.getByText(/зөвхөн хүлээн авсны дараа харна/)).toBeTruthy();
  });

  it('is there in English too', () => {
    show('en');
    expect(screen.getByText('About your information')).toBeTruthy();
    expect(screen.getByText(/90 days after whichever is later/i)).toBeTruthy();
  });
});

describe('the message field refuses contact details', () => {
  it('warns on blur, before the traveller presses the button', () => {
    show();
    const message = screen.getByLabelText('Аяллын тухай');

    fireEvent.blur(message, { target: { value: 'Call me on 99112233' } });

    expect(screen.getByText(/тайлбар дээр бичих шаардлагагүй/)).toBeTruthy();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('refuses to send one, and says why rather than editing it', async () => {
    show();
    fill('Утсаар холбогдоорой: 99112233, хоёр хүн байна.');
    submit();

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(mockSend).not.toHaveBeenCalled();
    // The typed message is still there: nothing was stripped behind their back.
    expect((screen.getByLabelText('Аяллын тухай') as HTMLTextAreaElement).value)
      .toContain('99112233');
  });

  it('accepts a message with dates in it', async () => {
    /* The false positive that the service's rule used to have: a dashed date is seven digits.
     * See withoutDates() in both copies of the rule. */
    show();
    fill('2026-07-14-нд хоёр хүн явган аялахыг хүсэж байна.');
    submit();

    await waitFor(() => expect(mockSend).toHaveBeenCalled());
  });

  it('clears the warning once the number is taken out', () => {
    show();
    const message = screen.getByLabelText('Аяллын тухай');

    fireEvent.blur(message, { target: { value: 'Call me on 99112233' } });
    expect(screen.getByText(/тайлбар дээр бичих шаардлагагүй/)).toBeTruthy();

    fireEvent.blur(message, { target: { value: 'Хоёр хүн, өглөөний аялал.' } });
    expect(screen.queryByText(/тайлбар дээр бичих шаардлагагүй/)).toBeNull();
  });
});

describe('the honeypot', () => {
  it('is present, empty, and hidden from assistive technology', () => {
    const { container } = show();
    const honeypot = container.querySelector('input[name="website"]') as HTMLInputElement;

    expect(honeypot).toBeTruthy();
    expect(honeypot.value).toBe('');
    // A person never sees it; a script that fills every input does.
    expect(honeypot.closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('is sent empty, which is what the API requires', async () => {
    show();
    fill();
    submit();

    await waitFor(() => expect(mockSend).toHaveBeenCalled());
    expect(mockSend.mock.calls[0][0].website).toBe('');
  });
});

describe('what gets sent', () => {
  it('sends the tour, an email in the email field, and no guide', async () => {
    show();
    fill();
    submit();

    await waitFor(() => expect(mockSend).toHaveBeenCalled());
    expect(mockSend.mock.calls[0][0]).toMatchObject({
      travellerName: 'Сараа',
      email: 'saraa@example.invalid',
      tourId: 7,
      guideId: null,
    });
    expect(mockSend.mock.calls[0][0].phone).toBeUndefined();
  });

  it('puts a phone number in the phone field, not the email one', async () => {
    show();
    fireEvent.change(screen.getByLabelText('Нэр'), { target: { value: 'Сараа' } });
    fireEvent.change(screen.getByLabelText('Утас эсвэл имэйл'), {
      target: { value: '+976 9911 2233' },
    });
    fireEvent.change(screen.getByLabelText('Аяллын тухай'), {
      target: { value: 'Хоёр хүн, хотын төвөөр явган аялахыг хүсэж байна.' },
    });
    submit();

    await waitFor(() => expect(mockSend).toHaveBeenCalled());
    expect(mockSend.mock.calls[0][0].phone).toBe('+976 9911 2233');
    expect(mockSend.mock.calls[0][0].email).toBeUndefined();
  });

  it('sends empty optional fields as null rather than ""', async () => {
    show();
    fill();
    submit();

    await waitFor(() => expect(mockSend).toHaveBeenCalled());
    expect(mockSend.mock.calls[0][0]).toMatchObject({
      partySize: null, preferredFrom: null, preferredTo: null,
    });
  });
});

describe('the confirmation', () => {
  it('shows the reference, grouped the way the service prints it', async () => {
    show();
    fill();
    submit();

    expect(await screen.findByText('R7K2-9QMX-4TBV')).toBeTruthy();
  });

  it('says the team will be in touch, not the guide', async () => {
    /* In R1a there is no email and guides have no portal — an admin relays by hand. A
     * confirmation implying the guide already has the request would be a promise the system
     * cannot keep. */
    show();
    fill();
    submit();

    expect(await screen.findByText(/Манай баг хөтөчтэй холбож/)).toBeTruthy();
    expect(screen.queryByText(/хөтөч тантай холбогдоно/i)).toBeNull();
  });

  it('repeats the deletion sentence, now naming their reference', async () => {
    show();
    fill();
    submit();

    expect(await screen.findByText(/R7K2-9QMX-4TBV лавлах код/)).toBeTruthy();
  });

  it('keeps the form and the message when the API refuses', async () => {
    mockSend.mockRejectedValue(new ApiError('This guide is not taking trip requests', 409));
    show();
    fill();
    submit();

    // The API's own words, because they are what say which rule was broken.
    expect(await screen.findByText('This guide is not taking trip requests')).toBeTruthy();
    expect(screen.getByLabelText('Аяллын тухай')).toBeTruthy();
  });
});

describe('on a phone', () => {
  it('scrolls inside the dialog rather than pushing its own buttons off screen', () => {
    /* jsdom computes no layout, so this asserts the mechanism rather than the pixels: the
     * longest form on the site opts into the scrolling dialog shell, and additions.css caps
     * .dlg-scroll at 78vh and collapses .fld-row to one column at 460px. */
    const { container } = show();
    const form = container.querySelector('form.dlg');

    expect(form?.classList.contains('dlg-scroll')).toBe(true);
    expect(form?.classList.contains('dlg-wide')).toBe(true);
  });

  it('groups the three narrow fields in a row that collapses', () => {
    const { container } = show();
    const row = container.querySelector('.fld-row');

    expect(row).toBeTruthy();
    expect(row?.querySelectorAll('.fld')).toHaveLength(3);
  });

  it('asks for a number with a numeric keypad', () => {
    show();
    expect(screen.getByLabelText('Хүний тоо').getAttribute('inputMode')).toBe('numeric');
  });
});
