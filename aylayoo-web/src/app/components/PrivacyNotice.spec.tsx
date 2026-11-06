import { act, fireEvent, render, screen } from '@testing-library/react';
import { LangProvider, translate, useLang } from '../../lib/i18n';
import { TEAM_EMAIL } from '../../lib/seo';
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
    expect(screen.getByText(/only after they have accepted/i)).toBeTruthy();
  });

  it('gives the retention rule as a date somebody can check, not "as necessary"', () => {
    show({ kind: 'tripRequest' });
    /* The exact rule lib/retention.ts implements: the LATER of the two dates, then 90 days.
     * "90 days after your trip dates" alone was the old wording, and it did not say which of
     * the two dates it counted from — the Mongolian and the English disagreed about it. */
    expect(screen.getByText(/90 days after whichever is later/i)).toBeTruthy();
    expect(screen.getByText(/the last day of your trip, or the day the request was closed/i))
      .toBeTruthy();
    expect(screen.getByText(/24 months/i)).toBeTruthy();
  });

  it('tells them how to ask for deletion before they have a reference', () => {
    show({ kind: 'tripRequest' });
    expect(screen.getByText(/the reference code you are given/i)).toBeTruthy();
    // Both halves, because erasure needs both and an admin matches them by hand.
    expect(screen.getByText(/and the contact details you used/i)).toBeTruthy();
  });

  it('names their actual reference once they have one', () => {
    show({ kind: 'tripRequest', reference: 'R7K2-9QMX-4TBV' });
    expect(screen.getByText(/reference code R7K2-9QMX-4TBV/)).toBeTruthy();
  });

  it('says WHERE to ask, because erasure is not self-service', () => {
    /* There is no delete button: an admin matches the reference against the contact used, by
     * hand, from an email. A notice promising deletion without an address promises nothing. */
    const { container } = show({ kind: 'tripRequest' });
    const link = container.querySelector(`a[href="mailto:${TEAM_EMAIL}"]`);
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe(TEAM_EMAIL);
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
      /* The deletion line carries the team's address alongside its sentence. An email is the
       * same in both languages and is not a dictionary key, so it comes off before the
       * sentence is looked up — otherwise this asserts that a sentence plus an address
       * translates, which no entry will ever match. */
      const mn = (item.textContent ?? '').replace(TEAM_EMAIL, '').trim();
      expect(mn.length).toBeGreaterThan(0);
      // Each Mongolian line has an English counterpart, or i18n-coverage would already fail.
      expect(translate(mn)).not.toMatch(/[А-Яа-яЁёӨөҮү]/);
    }
  });
});
