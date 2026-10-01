import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError, registerGuide as registerGuideImpl, type Aimag } from '../../lib/api';
import { DialogsProvider, useDialogs } from '../../lib/dialogs';
import { LangProvider } from '../../lib/i18n';
import { RegisterDialog } from './RegisterDialog';
import { Toast } from './Toast';

jest.mock('../../lib/api', () => {
  const actual = jest.requireActual('../../lib/api');
  return { ...actual, registerGuide: jest.fn() };
});
// jest.mock above is hoisted, so this import is already the mock.
const registerGuide = jest.mocked(registerGuideImpl);

/* Registration is how every real guide gets onto the site, so this form is the one path that
 * cannot be allowed to lose someone's details. The validation mirrors the API's, on purpose:
 * being told which box to fix beats a 400 about a field you cannot see. */

const aimag = (id: number, slug: string, nameMn: string): Aimag => ({
  id, slug, nameMn, nameEn: slug, region: 'khangai', descriptionMn: null, descriptionEn: null,
  imageUrl: null, isoCode: null, centerMn: null, centerEn: null, areaKm2: null,
});

const AIMAGS = [
  aimag(1, 'khuvsgul', 'Хөвсгөл'),
  aimag(2, 'arkhangai', 'Архангай'),
];

function Opener() {
  const { openRegister } = useDialogs();
  return <button type="button" onClick={openRegister}>open</button>;
}

function setup() {
  const view = render(
    <LangProvider>
      <DialogsProvider>
        <Opener />
        <RegisterDialog aimags={AIMAGS} />
        <Toast />
      </DialogsProvider>
    </LangProvider>,
  );
  act(() => { fireEvent.click(screen.getByRole('button', { name: 'open' })); });
  return view;
}

const submit = () => fireEvent.submit(document.querySelector('form.dlg') as HTMLFormElement);
const field = (name: string) => screen.getByRole('textbox', { name });
const type = (name: string, value: string) =>
  fireEvent.change(field(name), { target: { value } });
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

/** The minimum a guide has to give: name, phone, email and one province. */
function fillMinimum() {
  type('Нэр', 'Б. Болормаа');
  type('Утас', '+976 99112233');
  fireEvent.change(document.querySelector('input[name="email"]') as HTMLInputElement, {
    target: { value: 'bolormaa@example.com' },
  });
  press('Хөвсгөл');
}

beforeEach(() => {
  registerGuide.mockReset();
  registerGuide.mockResolvedValue({ data: { id: 1, status: 'pending' }, message: 'ok' });
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  });
});

describe('the form', () => {
  it('opens on the guide type, with Mongolian and countryside preselected', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Аяллын хөтөч' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Монгол' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Хөдөөгийн аялал' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('lists the aimags it was given', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Ажилладаг аймгууд' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Хөвсгөл' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Архангай' })).toBeTruthy();
  });

  it('asks a company for its company name instead of a personal one', () => {
    setup();
    expect(field('Нэр')).toBeTruthy();
    press('Аяллын компани');
    expect(field('Байгууллагын нэр')).toBeTruthy();
  });

  it('asks a driver which car, and nobody else', () => {
    setup();
    // The API rejects a car from anyone but a driver, so the field only exists for one.
    expect(screen.queryByRole('textbox', { name: 'Машин' })).toBeNull();
    press('Жолооч');
    expect(field('Машин')).toBeTruthy();
    press('Аяллын хөтөч');
    expect(screen.queryByRole('textbox', { name: 'Машин' })).toBeNull();
  });
});

describe('what it refuses to send', () => {
  it('will not register someone who works nowhere', async () => {
    setup();
    type('Нэр', 'Б. Болормаа');
    type('Утас', '+976 99112233');
    await act(async () => { submit(); });

    expect(registerGuide).not.toHaveBeenCalled();
    expect(screen.getByText('Дор хаяж нэг аймаг сонгоно уу')).toBeTruthy();
  });

  it('will not register a guide with no language', async () => {
    setup();
    fillMinimum();
    press('Монгол'); // unticks the only one
    await act(async () => { submit(); });
    expect(registerGuide).not.toHaveBeenCalled();
    expect(screen.getByText('Дор хаяж нэг хэл сонгоно уу')).toBeTruthy();
  });

  it('will not register a guide who does no kind of trip', async () => {
    setup();
    fillMinimum();
    press('Хөдөөгийн аялал');
    await act(async () => { submit(); });
    expect(registerGuide).not.toHaveBeenCalled();
    expect(screen.getByText('Дор хаяж нэг аяллын төрөл сонгоно уу')).toBeTruthy();
  });

  it('will not register a driver with no car', async () => {
    setup();
    fillMinimum();
    press('Жолооч');
    await act(async () => { submit(); });
    expect(registerGuide).not.toHaveBeenCalled();
    expect(screen.getByText('Жолооч бол машинаа бичнэ үү')).toBeTruthy();
  });
});

describe('what it sends', () => {
  it('sends the minimum correctly', async () => {
    setup();
    fillMinimum();
    await act(async () => { submit(); });

    expect(registerGuide).toHaveBeenCalledWith(expect.objectContaining({
      type: 'individual',
      name: 'Б. Болормаа',
      phone: '+976 99112233',
      email: 'bolormaa@example.com',
      languages: ['mn'],
      tripTypes: ['countryside'],
      aimagIds: [1],
      car: undefined,
    }), null);
  });

  it('sends several aimags and languages', async () => {
    setup();
    fillMinimum();
    press('Архангай');
    press('Англи');
    press('Хотын аялал');
    await act(async () => { submit(); });

    const [payload] = registerGuide.mock.calls[0];
    expect(payload.aimagIds).toEqual([1, 2]);
    expect(payload.languages).toEqual(['mn', 'en']);
    expect(payload.tripTypes).toEqual(['countryside', 'city']);
  });

  it('unticks on a second press', async () => {
    setup();
    fillMinimum();
    press('Архангай');
    press('Архангай');
    await act(async () => { submit(); });
    expect(registerGuide.mock.calls[0][0].aimagIds).toEqual([1]);
  });

  it('sends a driver\'s car, and the optional fields when filled', async () => {
    setup();
    fillMinimum();
    press('Жолооч');
    type('Машин', 'Land Cruiser 200');
    type('Байнга явдаг чиглэл', 'Хөвсгөл, Архангай');
    fireEvent.change(document.querySelector('input[name="experienceYears"]') as HTMLInputElement, {
      target: { value: '12' },
    });
    await act(async () => { submit(); });

    expect(registerGuide).toHaveBeenCalledWith(expect.objectContaining({
      type: 'driver',
      car: 'Land Cruiser 200',
      routeMn: 'Хөвсгөл, Архангай',
      experienceYears: 12,
    }), null);
  });

  it('leaves an untouched optional field out rather than sending an empty string', async () => {
    setup();
    fillMinimum();
    await act(async () => { submit(); });
    const [payload] = registerGuide.mock.calls[0];
    expect(payload.website).toBeUndefined();
    expect(payload.routeMn).toBeUndefined();
    expect(payload.experienceYears).toBeUndefined();
  });

  it('attaches a photo when one is chosen', async () => {
    setup();
    fillMinimum();
    const photo = new File(['x'], 'me.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[name="photo"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [photo] } });
    await act(async () => { submit(); });

    expect(registerGuide).toHaveBeenCalledWith(expect.anything(), photo);
  });
});

describe('after sending', () => {
  it('says it is pending review rather than published', async () => {
    setup();
    fillMinimum();
    await act(async () => { submit(); });
    await waitFor(() => expect(
      screen.getByRole('heading', { name: 'Хөтчөөр бүртгүүлэх хүсэлт илгээгдлээ' }),
    ).toBeTruthy());
    expect(document.querySelector('.done p')?.textContent).toContain('шалгаад');
  });

  it('keeps the form and explains when the request fails', async () => {
    // Registration is rate limited to 3/hour, and that message has to reach the person.
    registerGuide.mockRejectedValue(new ApiError('Too many requests. Please try again later.'));
    setup();
    fillMinimum();
    await act(async () => { submit(); });

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Too many requests'));
    expect((field('Нэр') as HTMLInputElement).value).toBe('Б. Болормаа');
  });

  it('cannot be submitted twice at once', async () => {
    // Replaced when the mocked request starts, so the test can finish it on demand.
    let release: () => void = () => undefined;
    registerGuide.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ data: { id: 1, status: 'pending' }, message: 'ok' }); }));
    setup();
    fillMinimum();

    await act(async () => { submit(); });
    submit();
    expect(registerGuide).toHaveBeenCalledTimes(1);
    await act(async () => { release(); });
  });

  it('starts blank the next time it opens', async () => {
    setup();
    fillMinimum();
    // Register as a driver, so the reset has a non-default type and an extra field to clear.
    press('Жолооч');
    type('Машин', 'Delica');
    press('Архангай');
    await act(async () => { submit(); });
    await waitFor(() => expect(
      screen.getByRole('heading', { name: 'Хөтчөөр бүртгүүлэх хүсэлт илгээгдлээ' }),
    ).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Хаах' }));

    act(() => { fireEvent.click(screen.getByRole('button', { name: 'open' })); });
    // Back to a guide, with nothing carried over from the driver registration before it.
    expect(screen.getByRole('button', { name: 'Аяллын хөтөч' }).getAttribute('aria-pressed')).toBe('true');
    expect((field('Нэр') as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('textbox', { name: 'Машин' })).toBeNull();
    // And the province picked last time is not still selected.
    expect(screen.getByRole('button', { name: 'Архангай' }).getAttribute('aria-pressed')).toBe('false');
  });
});
