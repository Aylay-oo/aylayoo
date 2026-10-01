import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError, sendContact as sendContactImpl } from '../../lib/api';
import { DialogsProvider, useDialogs, type ContactRequest } from '../../lib/dialogs';
import { LangProvider } from '../../lib/i18n';
import { ContactDialog } from './ContactDialog';
import { Toast } from './Toast';

jest.mock('../../lib/api', () => {
  const actual = jest.requireActual('../../lib/api');
  return { ...actual, sendContact: jest.fn() };
});
// jest.mock above is hoisted, so this import is already the mock.
const sendContact = jest.mocked(sendContactImpl);

/* The contact dialog is one of only two things on the site that write to the database, so what
 * it sends matters as much as what it shows. The single "phone or email" field in particular
 * has to arrive at the API as the right one of the two. */

/** Opens the dialog with a given request, the way a card's button would. */
function Opener({ request }: { request: ContactRequest }) {
  const { openContact } = useDialogs();
  return <button type="button" onClick={() => openContact(request)}>open</button>;
}

function setup(request: ContactRequest) {
  const view = render(
    <LangProvider>
      <DialogsProvider>
        <Opener request={request} />
        <ContactDialog />
        <Toast />
      </DialogsProvider>
    </LangProvider>,
  );
  act(() => { fireEvent.click(screen.getByRole('button', { name: 'open' })); });
  return view;
}

const GUIDE: ContactRequest = { kind: 'contact', subject: 'Б. Болормаа', guideId: 12 };
const TRIP: ContactRequest = { kind: 'booking', subject: 'Манзуширын хийд' };

function fill({ name = 'Сарнай', reach = '+976 99112233', message = 'Хоёр хүн, 7 сард' } = {}) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Нэр' }), { target: { value: name } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Утас эсвэл имэйл' }), { target: { value: reach } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Аяллын тухай' }), { target: { value: message } });
}

const submit = () => fireEvent.submit(document.querySelector('form.dlg') as HTMLFormElement);

beforeEach(() => {
  sendContact.mockReset();
  sendContact.mockResolvedValue({ message: 'ok' });
  // jsdom implements neither, and <dialog> needs both to open.
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  });
});

describe('opening', () => {
  it('titles itself after the guide it was opened from', () => {
    setup(GUIDE);
    expect(screen.getByRole('heading', { name: 'Б. Болормаа-тай холбогдох' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Хүсэлт илгээх' })).toBeTruthy();
  });

  it('reads as a booking when opened from a trip', () => {
    setup(TRIP);
    expect(screen.getByRole('heading', { name: 'Манзуширын хийд — захиалга' })).toBeTruthy();
    // Different blurb and a different verb on the button.
    expect(screen.getByRole('button', { name: 'Захиалах' })).toBeTruthy();
    expect(document.querySelector('.dlg > div > p')?.textContent)
      .toContain('Аяллын өдөр, хүний тоогоо');
  });
});

describe('what it sends', () => {
  it('sends an email as an email', async () => {
    setup(GUIDE);
    fill({ reach: 'sarnai@example.com' });
    await act(async () => { submit(); });

    expect(sendContact).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Сарнай',
      email: 'sarnai@example.com',
      phone: undefined,
      kind: 'contact',
      subject: 'Б. Болормаа',
      guideId: 12,
    }));
  });

  it('sends a phone number as a phone number', async () => {
    setup(GUIDE);
    fill({ reach: '+976 99112233' });
    await act(async () => { submit(); });

    expect(sendContact).toHaveBeenCalledWith(expect.objectContaining({
      phone: '+976 99112233',
      email: undefined,
    }));
  });

  it('marks a trip request as a booking, with no guide attached', async () => {
    setup(TRIP);
    fill();
    await act(async () => { submit(); });

    expect(sendContact).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'booking',
      subject: 'Манзуширын хийд',
      guideId: undefined,
    }));
  });

  it('trims what it sends', async () => {
    setup(GUIDE);
    fill({ name: '  Сарнай  ', reach: '  sarnai@example.com  ' });
    await act(async () => { submit(); });
    expect(sendContact).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Сарнай',
      email: 'sarnai@example.com',
    }));
  });
});

describe('what it refuses to send', () => {
  it('rejects a half-typed email rather than filing it as a phone number', async () => {
    // Without this check "sarnai@" would be sent as a phone number and nobody could reply.
    setup(GUIDE);
    fill({ reach: 'sarnai@' });
    await act(async () => { submit(); });

    expect(sendContact).not.toHaveBeenCalled();
    expect(screen.getByText('Утас эсвэл имэйлээ бүтэн бичнэ үү')).toBeTruthy();
  });

  it('rejects a phone number too short to dial', async () => {
    setup(GUIDE);
    fill({ reach: '991' });
    await act(async () => { submit(); });
    expect(sendContact).not.toHaveBeenCalled();
    expect(screen.getByText('Утас эсвэл имэйлээ бүтэн бичнэ үү')).toBeTruthy();
  });

  it('asks for a message, which the API requires', async () => {
    setup(GUIDE);
    fill({ message: 'үг' });
    await act(async () => { submit(); });
    expect(sendContact).not.toHaveBeenCalled();
    expect(screen.getByText('Аяллын талаар хэдэн үг бичнэ үү')).toBeTruthy();
  });
});

describe('after sending', () => {
  it('confirms, and closes on the button', async () => {
    setup(GUIDE);
    fill();
    await act(async () => { submit(); });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Хүсэлт илгээгдлээ' })).toBeTruthy());
    // The form is gone, so nobody submits twice.
    expect(screen.queryByRole('textbox', { name: 'Нэр' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Хаах' }));
    expect(screen.queryByRole('heading', { name: 'Хүсэлт илгээгдлээ' })).toBeNull();
  });

  it('keeps everything typed when the request fails, and says why', async () => {
    sendContact.mockRejectedValue(new ApiError('Хэт олон хүсэлт илгээлээ'));
    setup(GUIDE);
    fill({ name: 'Сарнай' });
    await act(async () => { submit(); });

    // The API's own message, not a generic one — a rate limit needs to be readable.
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Хэт олон хүсэлт илгээлээ'));
    expect((screen.getByRole('textbox', { name: 'Нэр' }) as HTMLInputElement).value).toBe('Сарнай');
    expect(screen.queryByRole('heading', { name: 'Хүсэлт илгээгдлээ' })).toBeNull();
  });

  it('cannot be submitted twice while the first attempt is in flight', async () => {
    // Replaced when the mocked request starts, so the test can finish it on demand.
    let release: () => void = () => undefined;
    sendContact.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ message: 'ok' }); }));
    setup(GUIDE);
    fill();

    await act(async () => { submit(); });
    expect(screen.getByRole('button', { name: 'Илгээж байна…' }).hasAttribute('disabled')).toBe(true);
    submit();
    expect(sendContact).toHaveBeenCalledTimes(1);

    await act(async () => { release(); });
  });

  it('starts clean the next time it opens', async () => {
    setup(GUIDE);
    fill();
    await act(async () => { submit(); });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Хүсэлт илгээгдлээ' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Хаах' }));
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'open' })); });
    // Back to the form, not still showing the confirmation.
    expect(screen.getByRole('textbox', { name: 'Нэр' })).toBeTruthy();
  });
});
