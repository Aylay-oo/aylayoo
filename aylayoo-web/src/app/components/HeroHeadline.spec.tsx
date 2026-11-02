import { act, fireEvent, render, screen } from '@testing-library/react';
import { LangProvider, useLang } from '../../lib/i18n';
import { HeroHeadline } from './HeroHeadline';

/* The headline is the one piece of the hero that moves on its own, and three of its four
 * requirements are invisible: what a screen reader hears, what happens under reduced motion,
 * and what happens in a background tab. Hence a spec of its own rather than a line in
 * accessibility.spec.tsx.
 */

const FULL = 'Аялъя өө, уулзъя өө, амаръя өө';
const PHRASE_MS = 2500;

/** Flips the language on demand, for the English side of the animation. */
function LangSwitch() {
  const { setLang } = useLang();
  return <button type="button" onClick={() => setLang('en')}>to-en</button>;
}

function setup() {
  return render(
    <LangProvider>
      <HeroHeadline />
      <LangSwitch />
    </LangProvider>,
  );
}

/** The phrase currently on screen — the one span the stylesheet makes visible. */
function showing(): string | undefined {
  return document.querySelector('.hero-cycle > span.on')?.textContent ?? undefined;
}

/** The phrase on its way out, which the stylesheet carries upwards as it fades. */
function leaving(): string | undefined {
  return document.querySelector('.hero-cycle > span.out')?.textContent ?? undefined;
}

function tick(ms = PHRASE_MS) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

/** Answers "yes" to prefers-reduced-motion, which jest-setup's stub answers "no" to. */
function prefersReducedMotion() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

/** Puts the tab in the background, or brings it back, the way a browser would. */
function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('the cycling headline', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    // `hidden` is defined on the document itself above, which outlives one test.
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('shows one phrase at a time, in order, and starts over', () => {
    setup();
    expect(showing()).toBe('Аялъя өө');

    tick();
    expect(showing()).toBe('Уулзъя өө');

    tick();
    expect(showing()).toBe('Амаръя өө');

    tick();
    expect(showing()).toBe('Аялъя өө');
  });

  it('holds a phrase for the full 2.5s before moving on', () => {
    setup();
    tick(PHRASE_MS - 100);
    expect(showing()).toBe('Аялъя өө');

    tick(100);
    expect(showing()).toBe('Уулзъя өө');
  });

  it('carries the phrase it replaced out, so the two move the same way', () => {
    // Without this the outgoing phrase would sink back down towards the incoming one.
    setup();
    tick();
    expect(leaving()).toBe('Аялъя өө');
    expect(showing()).toBe('Уулзъя өө');
  });

  it('keeps the whole headline in the h1 for screen readers and crawlers', () => {
    setup();
    const h1 = screen.getByRole('heading', { level: 1 });

    // The announced and indexed text is the whole line, not whichever third is on screen.
    expect(h1.textContent).toContain(FULL);
    expect(h1.querySelector('.sr')?.textContent).toBe(FULL);
  });

  it('hides the animated copy from assistive technology', () => {
    setup();
    // Otherwise the heading would be read as its full text plus a stuttering duplicate.
    expect(document.querySelector('.hero-cycle')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('cycles the English phrases from the dictionary', () => {
    setup();
    act(() => {
      fireEvent.click(screen.getByText('to-en'));
    });

    expect(showing()).toBe('Aylay oo');
    tick();
    expect(showing()).toBe('Uulzay oo');
    tick();
    expect(showing()).toBe('Amray oo');
    expect(screen.getByRole('heading', { level: 1 }).textContent)
      .toContain('Aylay oo, uulzay oo, amray oo');
  });

  it('stops while the tab is hidden and picks up where it left off', () => {
    /* A background tab throttles timers to about one a minute, so left running the headline
     * would sit mid-transition and then race through several phrases on return. */
    setup();
    tick();
    expect(showing()).toBe('Уулзъя өө');

    setTabHidden(true);
    tick(PHRASE_MS * 4);
    expect(showing()).toBe('Уулзъя өө');

    setTabHidden(false);
    tick();
    expect(showing()).toBe('Амаръя өө');
  });

  it('does not leave a timer running after it unmounts', () => {
    const { unmount } = setup();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('prefers-reduced-motion', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows all three phrases at once and never cycles', () => {
    prefersReducedMotion();
    setup();

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe(FULL);
    expect(document.querySelector('.hero-cycle')).toBeNull();

    // And nothing is scheduled that could change it.
    tick(PHRASE_MS * 3);
    expect(h1.textContent).toBe(FULL);
  });
});
