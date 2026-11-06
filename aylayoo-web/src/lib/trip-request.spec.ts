import { formatReference, looksLikeContact } from './trip-request';

/* The two client-side rules of the request form.
 *
 * `looksLikeContact` is a duplicate of a regex in aylayoo-service/src/lib/validators.ts, and a
 * duplicated rule is a rule that drifts. These cases are the ones the service's own spec uses,
 * so if one copy changes the other's tests say so.
 */

describe('looksLikeContact', () => {
  it.each([
    ['an email address', 'write to me at bat@example.com please'],
    ['an email on its own', 'bat.dorj+trip@example.co.uk'],
    ['a phone number', 'call 99112233'],
    ['a phone number with spaces', 'my number is 9911 2233'],
    ['an international number', '+976 9911 2233'],
    ['a number with dashes', '9911-2233'],
  ])('refuses %s', (_what, text) => {
    expect(looksLikeContact(text)).toBe(true);
  });

  it.each([
    ['an ordinary message', 'We would like a morning walk around the square for two people.'],
    ['a party size', 'There are 4 of us.'],
    /* Dates are the false positive worth excluding: seven digits with dashes, and the
     * refusal would tell them to remove a phone number they never wrote. */
    ['an ISO date', 'We arrive on 2026-07-14 and leave on the 20th.'],
    ['a dashed day-first date', 'We arrive 14-07-2026 and fly home on the 20th.'],
    /* The two below pass even without withoutDates, because the phone pattern only accepts
     * spaces and dashes as separators. They guard against that class being widened. */
    ['a slashed date', 'Can we go on 14/07/2026, or is 15/07/2026 better?'],
    ['a dotted date', 'We land 14.07.2026 in the morning.'],
    ['a sum with separators', 'Our budget is about 1,500,000 tugrik for the two of us.'],
    /* Six digits is a date or a price, not a phone number — the pattern needs seven. Worth
     * pinning: making this stricter would start refusing genuine messages. */
    ['six digits', 'Our budget is around 150000 tugrik.'],
    ['a time', 'Could we start at 9:30?'],
  ])('allows %s', (_what, text) => {
    expect(looksLikeContact(text)).toBe(false);
  });

  it('still catches a number written in date-like groups', () => {
    /* The limit of the date exclusion, stated as a test: 99-11-2233 has a four-digit tail but
     * 99 is not a day and 2233 is not a year, so it is not waved through as a date. */
    expect(looksLikeContact('ring me on 99-11-2233')).toBe(true);
  });

  it('refuses an unseparated seven-digit figure, which is the accepted cost', () => {
    /* Documents the remaining false positive rather than pretending it is gone. A budget
     * written without separators trips the rule; written with them, it does not. The form says
     * which field to use, so it is recoverable — unlike the date case, which was not. */
    expect(looksLikeContact('budget 1500000 tugrik')).toBe(true);
    expect(looksLikeContact('budget 1,500,000 tugrik')).toBe(false);
  });

  it('is not fooled by an @ that is not an address', () => {
    // No dot-suffix, so not email-shaped.
    expect(looksLikeContact('meet us @ the square')).toBe(false);
  });
});

describe('formatReference', () => {
  it('groups in fours, the way the service prints it', () => {
    expect(formatReference('R7K29QMX4TBV')).toBe('R7K2-9QMX-4TBV');
  });

  it('leaves a short or odd value alone rather than mangling it', () => {
    // Defensive: the API is the only source of these, but a half-written one must not throw.
    expect(formatReference('R7K2')).toBe('R7K2');
    expect(formatReference('')).toBe('');
  });
});
