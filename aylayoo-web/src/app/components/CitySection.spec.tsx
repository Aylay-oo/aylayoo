import { act, fireEvent, render, screen } from '@testing-library/react';
import { DialogsProvider } from '../../lib/dialogs';
import { LangProvider, useLang } from '../../lib/i18n';
import { CitySection } from './CitySection';

/* The home page's way through to the city section.
 *
 * What is pinned here is the standing rule in docs/STATUS.md: a new user-facing feature has to
 * be reachable from the home page. R1a shipped guided tours as the second of seven tabs on
 * /ulaanbaatar, with nothing on the home page naming them — reachable only by somebody who
 * already knew to look. These tests are what stops that link being dropped again.
 */

function Switch({ to }: { to: 'mn' | 'en' }) {
  const { setLang } = useLang();
  return <button type="button" onClick={() => setLang(to)}>switch</button>;
}

const show = (lang: 'mn' | 'en' = 'mn') => {
  const result = render(
    <LangProvider>
      <DialogsProvider>
        <Switch to={lang} />
        <CitySection />
      </DialogsProvider>
    </LangProvider>,
  );
  if (lang === 'en') {
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'switch' })); });
  }
  return result;
};

describe('the guided tours link', () => {
  it('is on the home page, named, and visible', () => {
    show();
    const link = screen.getByRole('link', { name: 'Хөтөчтэй аялал' });
    expect(link).toBeTruthy();
    // A real anchor, not a button that needs JavaScript to navigate.
    expect(link.tagName).toBe('A');
  });

  it('opens the tours tab directly, not just the city page', () => {
    /* The hash is the whole point: without it this lands on the itineraries tab and guided
     * tours stay the second of seven things to notice. UlaanbaatarPage reads it on mount. */
    show();
    expect(screen.getByRole('link', { name: 'Хөтөчтэй аялал' }).getAttribute('href'))
      .toBe('/ulaanbaatar#tours');
  });

  it('is translated', () => {
    show('en');
    const link = screen.getByRole('link', { name: 'Guided tours' });
    expect(link.getAttribute('href')).toBe('/ulaanbaatar#tours');
  });

  it('sits alongside the existing city link rather than replacing it', () => {
    show();
    expect(screen.getByRole('link', { name: /Улаанбаатарын хөтөлбөр/ }).getAttribute('href'))
      .toBe('/ulaanbaatar');
  });
});
