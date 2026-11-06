/* The two client-side rules of the trip request form.
 *
 * Both of these are enforced by aylayoo-service — this copy exists so a traveller finds out
 * before they press the button, not after. The service is the boundary; nothing here is a
 * security control, and the form must still handle the API refusing what these allow.
 *
 * Keeping a second copy of a regex is a real cost, so the duplication is deliberate and
 * narrow: these two patterns and nothing else. They are pinned against the service's own
 * behaviour in trip-request.spec.ts, and the patterns are identical to the ones in
 * aylayoo-service/src/lib/validators.ts.
 */

const EMAIL_SHAPED = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_SHAPED = /(?:\+?\d[\s-]*){7,}/;

/* Dates are taken out before the phone test, because "we arrive on 2026-07-14" is seven digits
 * separated by dashes and would otherwise be refused as a phone number — with a message
 * telling the traveller to remove something they never wrote.
 *
 * A date needs a four-digit year of 1900–2200, a month of 1–12 and a day of 1–31, which is what
 * stops `99-11-2233` passing as one. Identical to withoutDates() in the service's
 * validators.ts; trip-request.spec.ts and the service's own spec share these cases. */
const DATE_SHAPED = /\b(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})\b/g;

const withoutDates = (text: string): string =>
  text.replace(DATE_SHAPED, (match, first: string, middle: string, last: string) => {
    const yearFirst = first.length === 4;
    const year = Number(yearFirst ? first : last);
    const day = Number(yearFirst ? last : first);
    const month = Number(middle);

    const plausible = (yearFirst || last.length === 4)
      && year >= 1900 && year <= 2200
      && month >= 1 && month <= 12
      && day >= 1 && day <= 31;

    return plausible ? ' ' : match;
  });

/**
 * Does this text contain something shaped like an email address or a phone number?
 *
 * Used on the message field. A traveller who types their number into the message would route
 * it straight past the staging that keeps their contact details from the guide until the guide
 * has accepted — so the message is the one field where contact details are refused rather than
 * collected. The form says so on blur instead of waiting for the server's 400.
 */
export const looksLikeContact = (text: string): boolean =>
  EMAIL_SHAPED.test(text) || PHONE_SHAPED.test(withoutDates(text));

/**
 * `R7K29QMX4TBV` → `R7K2-9QMX-4TBV`, for showing a person.
 *
 * The same grouping formatReference() uses in the service, because this is the value somebody
 * will read down a phone or copy off a screenshot when they ask for their data to be deleted,
 * and it should look the same wherever they see it. The stored form has no dashes; the erasure
 * lookup normalises them away again.
 */
export const formatReference = (reference: string): string =>
  (reference.match(/.{1,4}/g) ?? [reference]).join('-');
