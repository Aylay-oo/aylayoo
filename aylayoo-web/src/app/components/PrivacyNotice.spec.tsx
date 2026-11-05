import { act, fireEvent, render, screen } from '@testing-library/react';
import { LangProvider, translate, useLang } from '../../lib/i18n';
import { PrivacyNotice } from './PrivacyNotice';

/* The notice has to say four specific things, in both languages, and each claim has to match
 * what the service actually does. A notice that drifts from the behaviour is worse than none —
 * it is a promise nobody is keeping. */

function Switch({ to }: { to: 'mn' | 'en' }) {
  const { setLang } = useLang();
  return <button type="button" onClick={() => setLang(to)}>switch</button>;
}

/* Renders in English. The provider starts in Mongolian — rendering the switch is not enough,
 * it has to be clicked, which is the bug this helper had on first write. */
const show = (props: Parameters<typeof PrivacyNotice>[0]) => {
  const result = render(
    <LangProvider><Switch to="en" /><PrivacyNotice {...props} /></LangProvider>,
  );
  act(() => { fireEvent.click(screen.getByRole('button', { name: 'switch' })); });
  return result;
};

describe('the trip-request notice', () => {
  it('says all four things', () => {
    const { container } = show({ kind: 'tripRequest' });
    // what / who / how long / how to delete
    expect(container.querySelectorAll('li')).toHaveLength(4);
  });

  it('names the staging: the guide sees contact only after accepting', () => {
    show({ kind: 'tripRequest' });
    // The claim the service enforces in admin-trips.ts.
    expect(screen.getByText(/only once they have/i)).toBeTruthy();
  });

  it('gives the retention rule as a date somebody can check, not "as necessary"', () => {
    show({ kind: 'tripRequest' });
    expect(screen.getByText(/90 days after your trip dates/i)).toBeTruthy();
    expect(screen.getByText(/24 months/i)).toBeTruthy();
  });

  it('tells them how to ask for deletion before they have a reference', () => {
    show({ kind: 'tripRequest' });
    expect(screen.getByText(/the reference you are given/i)).toBeTruthy();
  });

  it('names their actual reference once they have one', () => {
    show({ kind: 'tripRequest', reference: 'R7K2-9QMX-4TBV' });
    expect(screen.getByText(/reference R7K2-9QMX-4TBV/)).toBeTruthy();
  });
});

describe('the review notice', () => {
  it('describes what a review collects, not what a trip request collects', () => {
    show({ kind: 'review' });
    expect(screen.getByText(/the name you choose to show/i)).toBeTruthy();
    // It must NOT claim to collect a phone number, which a review form does not ask for.
    expect(screen.queryByText(/your contact details are deleted/i)).toBeNull();
  });

  it('says a review is moderated before publication, and then public', () => {
    show({ kind: 'review' });
    expect(screen.getByText(/before it is published/i)).toBeTruthy();
  });

  it('says a review never holds contact details', () => {
    show({ kind: 'review' });
    expect(screen.getByText(/never holds contact details/i)).toBeTruthy();
  });
});

describe('both read in Mongolian too', () => {
  it.each(['tripRequest', 'review'] as const)('%s translates every line', (kind) => {
    const { container } = render(<LangProvider><PrivacyNotice kind={kind} /></LangProvider>);
    for (const item of container.querySelectorAll('li')) {
      const mn = item.textContent ?? '';
      expect(mn.length).toBeGreaterThan(0);
      // Each Mongolian line has an English counterpart, or i18n-coverage would already fail.
      expect(translate(mn)).not.toMatch(/[А-Яа-яЁёӨөҮү]/);
    }
  });
});
