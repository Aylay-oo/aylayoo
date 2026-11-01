import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Guide, GuideType } from '../../lib/api';
import { DialogsProvider, useDialogs } from '../../lib/dialogs';
import { LangProvider, useLang } from '../../lib/i18n';
import { TravelStateProvider } from '../../lib/travel-state';
import type { Resource } from '../../lib/use-resource';
import { GuidesSection } from './GuidesSection';

/* The guides section has to survive the whole life of the site: empty at launch, then a
 * handful of people, then enough to fill a scrolling row. Each of those is a different
 * layout, and the awkward ones are the early ones. */

const guide = (id: number, name: string, type: GuideType = 'individual'): Guide => ({
  id, name, type, bioMn: null, bioEn: null, languages: ['mn', 'en'],
  tripTypes: ['countryside'], phone: '+976 99110000', email: `g${id}@example.com`,
  photoUrl: null, website: null, createdAt: '2026-09-26T18:16:43.000Z',
  fullName: null, experienceYears: 5, experienceRange: null,
  routeMn: 'Хөвсгөл', routeEn: 'Khövsgöl', car: type === 'driver' ? 'Delica' : null,
  rating: null, reviewCount: null, aimags: [],
});

function resource(data: Guide[] | null, over: Partial<Resource<Guide[]>> = {}): Resource<Guide[]> {
  return { data, loading: false, error: null, reload: jest.fn(), ...over };
}

/** Flips the language on demand, for checking the new English copy. */
function LangSwitch({ to }: { to: 'mn' | 'en' }) {
  const { setLang } = useLang();
  return <button type="button" onClick={() => setLang(to)}>switch</button>;
}

/** Reports whether the registration dialog is open, so the empty state's CTA can be checked. */
function RegisterProbe() {
  const { registerOpen } = useDialogs();
  return <div data-testid="register-open">{String(registerOpen)}</div>;
}

function setup(guides: Resource<Guide[]>) {
  return render(
    <LangProvider>
      <TravelStateProvider>
        <DialogsProvider>
          <GuidesSection guides={guides} />
          <RegisterProbe />
        </DialogsProvider>
      </TravelStateProvider>
    </LangProvider>,
  );
}

const carousel = () => document.getElementById('guideCar');
const cards = () => [...document.querySelectorAll('.car-track .g-card')];
const names = () => cards().map((card) => card.querySelector('.g-top b')?.textContent);
const registerOpen = () => screen.getByTestId('register-open').textContent;

/* jsdom gives every element a zero width, so a carousel there always looks like it fits.
 * These stubs give the view and the cards real sizes and then trigger a re-measure through
 * the resize path the hook already listens on. */
function stubLayout({ viewWidth, cardWidth }: { viewWidth: number; cardWidth: number }) {
  const view = document.querySelector('.car-view') as HTMLElement;
  Object.defineProperty(view, 'clientWidth', { configurable: true, value: viewWidth });
  for (const card of document.querySelectorAll('.car-track > *')) {
    (card as HTMLElement).getBoundingClientRect = () => ({ width: cardWidth, height: 200 }) as DOMRect;
  }
  act(() => { fireEvent(window, new Event('resize')); });
}

describe('with no guides at all', () => {
  /* How the site launches: the pre-launch samples are deleted and real guides arrive by
   * registration, so this is the state a first visitor sees. */
  it('says they are coming rather than showing an empty carousel', () => {
    setup(resource([]));
    expect(screen.getByRole('heading', { name: 'Хөтчүүд удахгүй нэмэгдэнэ' })).toBeTruthy();
    expect(carousel()).toBeNull();
  });

  it('offers registration, and opens the form', () => {
    setup(resource([]));
    expect(registerOpen()).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Хөтчөөр бүртгүүлэх' }));
    expect(registerOpen()).toBe('true');
  });

  it('hides the filters, which would all lead to the same empty state', () => {
    setup(resource([]));
    expect(screen.queryByRole('group', { name: 'Шүүлтүүр' })).toBeNull();
  });

  it('still shows the section heading and intro', () => {
    setup(resource([]));
    expect(screen.getByRole('heading', { name: 'Манай хөтөч & жолооч нар' })).toBeTruthy();
  });

  it('reads in English too', () => {
    /* The empty state is copy the design never had, so its English lives in i18n-extra and is
     * easy to forget. The language switch is the real one from the provider. */
    render(
      <LangProvider>
        <TravelStateProvider>
          <DialogsProvider>
            <LangSwitch to="en" />
            <GuidesSection guides={resource([])} />
          </DialogsProvider>
        </TravelStateProvider>
      </LangProvider>,
    );
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'switch' })); });

    expect(screen.getByRole('heading', { name: 'Guides are coming soon' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Register as a guide' })).toBeTruthy();
    expect(document.querySelector('.guides-empty p')?.textContent)
      .toContain('No verified guides are registered yet');
  });
});

describe('with a handful of guides', () => {
  it('shows them without a marquee when they fit', () => {
    setup(resource([guide(1, 'Нэг'), guide(2, 'Хоёр'), guide(3, 'Гурав')]));
    expect(names()).toEqual(['Нэг', 'Хоёр', 'Гурав']);

    /* `static` is the whole mechanism: globals.css centres the row and hides the arrows off
     * that class, and the hook renders no duplicate set and runs no animation. The arrows
     * stay in the DOM and are hidden by CSS, exactly as in the design, so their visibility
     * is not assertable here — jsdom applies no stylesheet. */
    expect(carousel()?.classList.contains('static')).toBe(true);
    expect(cards()).toHaveLength(3);
    // The hint describes a drift that is not happening, so it really is absent.
    expect(document.querySelector('.car-hint')).toBeNull();
    // And the track is not transformed away from the start.
    const track = document.querySelector('.car-track') as HTMLElement;
    expect(track.style.transform).toBe('translate3d(0px,0,0)');
  });

  it.each([1, 2, 3])('renders %i guide(s) exactly once', (count) => {
    setup(resource(Array.from({ length: count }, (_, i) => guide(i + 1, `Хөтөч ${i + 1}`))));
    expect(cards()).toHaveLength(count);
    expect(carousel()?.classList.contains('static')).toBe(true);
  });

  it('duplicates the set only once there is something to scroll', () => {
    setup(resource([guide(1, 'Нэг'), guide(2, 'Хоёр'), guide(3, 'Гурав'), guide(4, 'Дөрөв')]));
    expect(cards()).toHaveLength(4);

    // Four 300px cards in a 1000px view: 1200 > 1002, so it has to scroll.
    stubLayout({ viewWidth: 1000, cardWidth: 300 });
    expect(carousel()?.classList.contains('static')).toBe(false);
    expect(cards()).toHaveLength(8);
    expect(names()).toEqual(['Нэг', 'Хоёр', 'Гурав', 'Дөрөв', 'Нэг', 'Хоёр', 'Гурав', 'Дөрөв']);
  });

  it('goes back to static when the viewport grows enough to fit everything', () => {
    setup(resource([guide(1, 'Нэг'), guide(2, 'Хоёр'), guide(3, 'Гурав'), guide(4, 'Дөрөв')]));
    stubLayout({ viewWidth: 1000, cardWidth: 300 });
    expect(cards()).toHaveLength(8);

    stubLayout({ viewWidth: 2000, cardWidth: 300 });
    expect(carousel()?.classList.contains('static')).toBe(true);
    expect(cards()).toHaveLength(4);
  });
});

describe('the marquee', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const start = () => {
    setup(resource([1, 2, 3, 4, 5].map((i) => guide(i, `Хөтөч ${i}`))));
    stubLayout({ viewWidth: 1000, cardWidth: 300 });
  };

  it('hides the duplicates from assistive technology', () => {
    start();
    const originals = cards().slice(0, 5);
    const clones = cards().slice(5);
    expect(originals.every((card) => card.getAttribute('aria-hidden') === null)).toBe(true);
    expect(clones.every((card) => card.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(clones.every((card) => card.hasAttribute('inert'))).toBe(true);
  });

  it('shows the arrows and the hover hint', () => {
    start();
    expect(screen.getByRole('button', { name: 'Дараах' })).toBeTruthy();
    expect(document.querySelector('.car-hint')).toBeTruthy();
  });

  it('moves the track when an arrow is used', () => {
    start();
    const track = document.querySelector('.car-track') as HTMLElement;
    const before = track.style.transform;
    fireEvent.click(screen.getByRole('button', { name: 'Дараах' }));
    // The step is animated, so let a frame or two pass.
    act(() => { jest.advanceTimersByTime(600); });
    expect(track.style.transform).not.toBe(before);
  });
});

describe('filtering', () => {
  const MIXED = [
    guide(1, 'Хувь хөтөч', 'individual'),
    guide(2, 'Жолооч', 'driver'),
    guide(3, 'Компани', 'company'),
  ];

  it('starts on "all"', () => {
    setup(resource(MIXED));
    expect(screen.getByRole('button', { name: 'Бүгд' }).getAttribute('aria-pressed')).toBe('true');
    expect(cards()).toHaveLength(3);
  });

  it('narrows to one type, mapping the design\'s "guide" to the API\'s "individual"', () => {
    setup(resource(MIXED));
    fireEvent.click(screen.getByRole('button', { name: 'Аяллын хөтөч нар' }));
    expect(names()).toEqual(['Хувь хөтөч']);
  });

  it.each([
    ['Туршлагатай жолооч нар', 'Жолооч'],
    ['Аяллын компаниуд', 'Компани'],
  ])('%s shows only %s', (filter, expected) => {
    setup(resource(MIXED));
    fireEvent.click(screen.getByRole('button', { name: filter }));
    expect(names()).toEqual([expected]);
  });

  it('explains an empty filter result without losing the way back', () => {
    setup(resource([guide(1, 'Зөвхөн хувь хөтөч', 'individual')]));
    fireEvent.click(screen.getByRole('button', { name: 'Туршлагатай жолооч нар' }));
    expect(screen.getByText(/Энэ төрлийн хөтөч одоохондоо алга/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Бүгдийг харах' }));
    expect(names()).toEqual(['Зөвхөн хувь хөтөч']);
  });
});

describe('states', () => {
  it('shows skeletons while loading', () => {
    setup(resource(null, { loading: true }));
    expect(document.querySelectorAll('.sk-card').length).toBe(4);
    expect(screen.queryByRole('heading', { name: 'Хөтчүүд удахгүй нэмэгдэнэ' })).toBeNull();
  });

  it('offers a retry on failure, and does not claim there are no guides', () => {
    const reload = jest.fn();
    setup(resource(null, { error: 'boom', reload }));
    // Telling someone "guides coming soon" when the request merely failed would be a lie.
    expect(screen.queryByRole('heading', { name: 'Хөтчүүд удахгүй нэмэгдэнэ' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Дахин оролдох' }));
    expect(reload).toHaveBeenCalled();
  });
});

describe('a guide from the tourism association roster', () => {
  /* The roster records languages and an experience band, and nothing else — no aimags, trip
   * types, route, bio or photo. The card has to read as complete anyway. */
  const ROSTER = guide(1, 'Ж. Содномпил');
  const rosterGuide = {
    ...ROSTER,
    fullName: 'Жаргал Содномпил',
    languages: ['en', 'ko'],
    experienceYears: null,
    experienceRange: '4-6 жил',
    routeMn: null,
    routeEn: null,
    tripTypes: [] as ('city' | 'countryside')[],
    aimags: [],
  };

  it('shows the experience band as recorded, not a made-up number', () => {
    setup(resource([rosterGuide]));
    const card = cards()[0];
    expect(card.textContent).toContain('Туршлага:');
    expect(card.textContent).toContain('4-6 жил');
  });

  it('shows the languages it does have', () => {
    setup(resource([rosterGuide]));
    expect(cards()[0].textContent).toContain('Англи, Солонгос');
  });

  it('leaves out the rows it has nothing for, rather than showing empty labels', () => {
    setup(resource([rosterGuide]));
    const card = cards()[0];
    expect(card.textContent).not.toContain('Чиглэл:');
    expect(card.textContent).not.toContain('Машин:');
    // And no stars, since rating is null.
    expect(card.textContent).not.toContain('★');
  });

  it('uses the initials avatar when there is no photo', () => {
    setup(resource([rosterGuide]));
    const avatar = cards()[0].querySelector('.g-av');
    expect(avatar?.textContent).toBe('ЖС');
    expect(cards()[0].querySelector('img')).toBeNull();
  });

  it('translates the band into English', () => {
    render(
      <LangProvider>
        <TravelStateProvider>
          <DialogsProvider>
            <LangSwitch to="en" />
            <GuidesSection guides={resource([rosterGuide])} />
          </DialogsProvider>
        </TravelStateProvider>
      </LangProvider>,
    );
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'switch' })); });
    expect(document.body.textContent).toContain('4–6 years');
    expect(document.body.textContent).toContain('English, Korean');
  });

  it('still prefers an explicit year count when a self-registered guide has one', () => {
    setup(resource([{ ...rosterGuide, experienceYears: 6, experienceRange: null }]));
    expect(cards()[0].textContent).toContain('6 жил');
  });
});

describe('linking to a guide\u2019s own page', () => {
  it('makes the name on each card a link to /guides/[id]', () => {
    setup(resource([guide(7, 'Б. Болормаа', 'individual')]));

    // The marquee renders clones, so the same link appears more than once; every copy must
    // point at the same place, and the clones are already aria-hidden + inert on the article.
    const links = screen.getAllByRole('link', { name: 'Б. Болормаа', hidden: true });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.getAttribute('href')).toBe('/guides/7');
  });
});
