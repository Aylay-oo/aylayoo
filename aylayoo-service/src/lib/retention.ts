/* The retention passes for `trip_requests`.
 *
 * These exist because the privacy notice on the trip request form makes two dated promises to
 * the traveller — contact details cleared 90 days after the trip or the closure, the whole
 * request gone at 24 months — and a promise nothing enforces is a promise that quietly expires.
 * Until this file existed the clearing was a comment in db/schema.ts describing a "cleanup pass"
 * that did not exist.
 *
 * Both passes are counted, never logged row by row: `src/lib/logging.ts` sets the rule that our
 * logs carry no personal data, and a retention log naming the rows it deleted would be a record
 * of exactly the data we just promised to delete.
 *
 * Run daily by the Cron Trigger in wrangler.jsonc, and by hand from the documented procedure in
 * README.md when the cron has not run. Both passes are idempotent: running them twice in a day
 * clears and deletes nothing extra, which is what makes a manual catch-up safe.
 */

import { and, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { tripRequests } from '../db/schema';

/** Days after the retention anchor before `email` and `phone` are cleared. */
export const CONTACT_RETENTION_DAYS = 90;

/** Months after creation before the whole request is deleted. */
export const REQUEST_RETENTION_MONTHS = 24;

/* Whether an undelivered review token holds the contact back.
 *
 * The rule the plan states is "never before a *required* review token has been delivered", and
 * the word doing the work is "required". A review token is only required once there is
 * something to review — R3's reviews — and R3 has not shipped: there is no `reviews` table, no
 * token is ever generated, and nothing ever sets `reviewTokenDeliveredAt`. So in R1a **no token
 * is required and the clearing must not wait for one**. Read the rule the other way and
 * `reviewTokenDeliveredAt IS NULL` would be true for every request forever, the pass would
 * clear nothing, and the 90-day sentence on the form would be false for every traveller who
 * ever used it.
 *
 * Flip this to `true` in R3, in the same change that starts delivering tokens. From then on a
 * `completed` request waits for its token, because that is the one case where the traveller is
 * owed a review link and clearing the contact first would make it undeliverable. Any other
 * closed status — `declined`, `cancelled` — never required a token and never waits.
 */
export const REVIEW_TOKEN_BLOCKS_CLEARING = false;

const DAY_SECONDS = 86_400;

/* When the 90 days start counting.
 *
 * The later of: the end of the last preferred day, the closure, and — as a floor — the
 * creation. Three reasons for the three terms:
 *
 *   `preferred_to` end-of-day   a trip booked four months out must not have its contact
 *                               cleared before the trip happens, and the traveller reads "90
 *                               days after your trip dates" as 90 days after the trip *ended*,
 *                               so the day itself is included (`+ 1 day`).
 *   `closed_at`                 a request closed long after the trip keeps its contact for 90
 *                               days from the closure, because that is when the relay really
 *                               finished.
 *   `created_at`                a floor, so the anchor is never NULL. Dates are optional on the
 *                               form and a request can sit open forever; without this term a
 *                               request with no dates and no closure would hold a phone number
 *                               until the 24-month delete caught it. With it, such a request is
 *                               cleared 90 days after it arrived.
 *
 * `unixepoch()` returns NULL for anything it cannot parse, which COALESCE turns into 0 rather
 * than poisoning the whole MAX() — a malformed date must not stop the pass.
 */
const retentionAnchor = sql`MAX(
  ${tripRequests.createdAt},
  COALESCE(${tripRequests.closedAt}, 0),
  COALESCE(unixepoch(${tripRequests.preferredTo}) + ${DAY_SECONDS}, 0)
)`;

/**
 * Clears `email` and `phone` on every request past its contact retention, and stamps
 * `contactClearedAt`.
 *
 * Returns how many rows were cleared. Takes `now` so the boundaries can be tested rather than
 * waited for.
 */
export async function clearExpiredContacts(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = Math.floor(now.getTime() / 1000) - CONTACT_RETENTION_DAYS * DAY_SECONDS;

  const conditions = [
    // Not already cleared — the stamp is what makes this pass idempotent.
    isNull(tripRequests.contactClearedAt),
    /* Something to clear. A row whose contact is already absent is left alone rather than
     * stamped, so `contactClearedAt` means "this pass cleared it" and not "there was nothing
     * here". */
    or(isNotNull(tripRequests.email), isNotNull(tripRequests.phone)),
    sql`${retentionAnchor} <= ${cutoff}`,
  ];

  /* The review-token hold, off until R3 — see REVIEW_TOKEN_BLOCKS_CLEARING. Only a `completed`
   * request is owed a token, so only a `completed` one waits for it. */
  if (REVIEW_TOKEN_BLOCKS_CLEARING) {
    conditions.push(or(
      ne(tripRequests.status, 'completed'),
      isNotNull(tripRequests.reviewTokenDeliveredAt),
    ));
  }

  const cleared = await db
    .update(tripRequests)
    .set({ email: null, phone: null, contactClearedAt: now })
    .where(and(...conditions))
    .returning({ id: tripRequests.id });

  return cleared.length;
}

/**
 * Deletes every request older than the 24-month limit, contact cleared or not.
 *
 * Calendar months through SQLite's own date arithmetic rather than a 730-day approximation, so
 * "24 months" means the same date two years on and the boundary does not drift with leap years.
 * The modifier is a bound parameter, which `datetime()` accepts.
 */
export async function deleteExpiredRequests(db: Db, now: Date = new Date()): Promise<number> {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const modifier = `+${REQUEST_RETENTION_MONTHS} months`;

  const deleted = await db
    .delete(tripRequests)
    .where(sql`unixepoch(datetime(${tripRequests.createdAt}, 'unixepoch', ${modifier})) <= ${nowSeconds}`)
    .returning({ id: tripRequests.id });

  return deleted.length;
}

/**
 * Both passes, in the order that matters: clear first, then delete.
 *
 * Deleting first would be indistinguishable in the counts but wrong in the logs — a row deleted
 * at 24 months would never be recorded as having had its contact cleared, and the two numbers
 * are the only evidence either pass ran.
 */
export async function runRetention(db: Db, now: Date = new Date()) {
  const contactsCleared = await clearExpiredContacts(db, now);
  const requestsDeleted = await deleteExpiredRequests(db, now);
  return { contactsCleared, requestsDeleted };
}
