import { beforeEach, describe, expect, test } from 'bun:test';
import { getDb } from '../db/client';
import type { Db } from '../db/client';
import { createTestDb } from '../test/d1';
import {
  CONTACT_RETENTION_DAYS, REQUEST_RETENTION_MONTHS, REVIEW_TOKEN_BLOCKS_CLEARING,
  clearExpiredContacts, deleteExpiredRequests, runRetention,
} from './retention';

/* The retention passes, boundary by boundary.
 *
 * These tests are the only thing standing behind a promise made to travellers on the trip
 * request form: contact details cleared 90 days after the trip or the closure, the whole request
 * gone at 24 months. Before this file the promise was a comment describing a pass that did not
 * exist.
 *
 * Each boundary is checked on both sides — one second early and exactly on time — because an
 * off-by-one here is invisible in production until somebody's phone number has outlived the
 * sentence that promised it would not.
 *
 * Every value is invented. No real traveller details appear in this repository.
 */

const DAY = 86_400;

/** The notional "now" every test measures from: 2027-06-01T00:00:00Z. */
const NOW = new Date('2027-06-01T00:00:00Z');
const at = (seconds: number) => new Date(seconds * 1000);
const epoch = (date: Date) => Math.floor(date.getTime() / 1000);

const FAKE_EMAIL = 'not-a-real-traveller@example.invalid';
const FAKE_PHONE = '+976 70000333';

let db: Db;
let d1: D1Database;

beforeEach(() => {
  d1 = createTestDb();
  db = getDb(d1);
});

/** Inserts one request with the columns these passes read, and returns its id. */
async function seedRequest(over: {
  reference?: string;
  createdAt?: number;
  closedAt?: number | null;
  preferredTo?: string | null;
  status?: string;
  email?: string | null;
  phone?: string | null;
  contactClearedAt?: number | null;
  reviewTokenDeliveredAt?: number | null;
} = {}) {
  const row = {
    reference: 'TESTAAAA2345',
    createdAt: epoch(NOW) - 400 * DAY,
    closedAt: null,
    preferredTo: null,
    status: 'new',
    email: FAKE_EMAIL,
    phone: FAKE_PHONE,
    contactClearedAt: null,
    reviewTokenDeliveredAt: null,
    ...over,
  };

  const result = await d1
    .prepare(`INSERT INTO trip_requests
      (reference, traveller_name, email, phone, message, preferred_to, status,
       created_at, closed_at, contact_cleared_at, review_token_delivered_at)
      VALUES (?, 'Test Traveller', ?, ?, 'An invented request, used only by these tests.',
              ?, ?, ?, ?, ?, ?)
      RETURNING id`)
    .bind(
      row.reference, row.email, row.phone, row.preferredTo, row.status,
      row.createdAt, row.closedAt, row.contactClearedAt, row.reviewTokenDeliveredAt,
    )
    .run();

  return (result.results[0] as { id: number }).id;
}

const readRow = async (id: number) => {
  const r = await d1
    .prepare('SELECT email, phone, contact_cleared_at, status FROM trip_requests WHERE id = ?')
    .bind(id)
    .run();
  return r.results[0] as
    { email: string | null; phone: string | null; contact_cleared_at: number | null } | undefined;
};

const countRows = async () => {
  const r = await d1.prepare('SELECT COUNT(*) AS n FROM trip_requests').run();
  return (r.results[0] as { n: number }).n;
};

/* ---------------------------------------------------------------------------
 * The 90-day contact clock, and which date it counts from
 * ------------------------------------------------------------------------- */
describe('the contact clock counts from the LATER of the trip and the closure', () => {
  test('a trip that ended 90 days ago is cleared, and the stamp is set', async () => {
    /* preferred_to is a DATE, so the clock starts at the END of that day: a trip whose last day
     * is the 2nd of March starts counting at midnight on the 3rd. 2027-03-03 + 90 days is
     * exactly NOW. */
    const id = await seedRequest({ preferredTo: '2027-03-02', closedAt: null });

    expect(await clearExpiredContacts(db, NOW)).toBe(1);

    const row = await readRow(id);
    expect(row?.email).toBeNull();
    expect(row?.phone).toBeNull();
    expect(row?.contact_cleared_at).toBe(epoch(NOW));
  });

  test('one second before the boundary it is left alone', async () => {
    const id = await seedRequest({ preferredTo: '2027-03-02', closedAt: null });

    expect(await clearExpiredContacts(db, at(epoch(NOW) - 1))).toBe(0);

    const row = await readRow(id);
    expect(row?.email).toBe(FAKE_EMAIL);
    expect(row?.contact_cleared_at).toBeNull();
  });

  test('a LATER closure wins over the trip dates, and holds the contact longer', async () => {
    /* The trip ended long ago but the request was only closed yesterday: the clock restarts
     * from the closure, so nothing is cleared. This is the case that makes the rule "the later
     * of the two" rather than "the trip dates". */
    const id = await seedRequest({
      preferredTo: '2026-01-10',
      closedAt: epoch(NOW) - DAY,
      status: 'completed',
    });

    expect(await clearExpiredContacts(db, NOW)).toBe(0);
    expect((await readRow(id))?.email).toBe(FAKE_EMAIL);

    // ...and 90 days after that closure, it goes.
    expect(await clearExpiredContacts(db, at(epoch(NOW) - DAY + CONTACT_RETENTION_DAYS * DAY)))
      .toBe(1);
  });

  test('LATER trip dates win over an earlier closure', async () => {
    /* The mirror case, and the one the column comment was written for: a trip booked months
     * ahead, declined today. The contact must survive until the trip itself is 90 days past,
     * not 90 days from the closure. */
    const future = '2027-09-01';
    const id = await seedRequest({
      preferredTo: future,
      closedAt: epoch(NOW) - 100 * DAY,
      status: 'cancelled',
    });

    expect(await clearExpiredContacts(db, NOW)).toBe(0);
    expect((await readRow(id))?.email).toBe(FAKE_EMAIL);

    const tripEnd = epoch(new Date(`${future}T00:00:00Z`)) + DAY;
    expect(await clearExpiredContacts(db, at(tripEnd + CONTACT_RETENTION_DAYS * DAY - 1))).toBe(0);
    expect(await clearExpiredContacts(db, at(tripEnd + CONTACT_RETENTION_DAYS * DAY))).toBe(1);
  });

  test('with no dates and no closure, creation is the floor', async () => {
    /* Dates are optional on the form and a request can sit open forever. Without the created_at
     * floor the anchor would be 0 for such a row and the MAX() would never advance, so a phone
     * number would sit there until the 24-month delete. */
    const id = await seedRequest({
      createdAt: epoch(NOW) - CONTACT_RETENTION_DAYS * DAY,
      preferredTo: null,
      closedAt: null,
    });

    expect(await clearExpiredContacts(db, NOW)).toBe(1);
    expect((await readRow(id))?.phone).toBeNull();
  });

  test('a request created yesterday keeps its contact', async () => {
    await seedRequest({ createdAt: epoch(NOW) - DAY, preferredTo: null, closedAt: null });
    expect(await clearExpiredContacts(db, NOW)).toBe(0);
  });

  test('an unparseable date does not stop the pass — the floor still applies', async () => {
    /* unixepoch() returns NULL for this, which COALESCE turns into 0; without that the whole
     * MAX() would be NULL and the row would never be cleared. */
    const id = await seedRequest({
      preferredTo: 'not-a-date',
      createdAt: epoch(NOW) - 200 * DAY,
      closedAt: null,
    });

    expect(await clearExpiredContacts(db, NOW)).toBe(1);
    expect((await readRow(id))?.email).toBeNull();
  });
});

/* ---------------------------------------------------------------------------
 * The review token must not block clearing while reviews do not exist
 * ------------------------------------------------------------------------- */
describe('the review token does not hold the contact in R1a', () => {
  test('the flag is off, because nothing delivers a token yet', () => {
    /* If this is ever flipped on before R3 actually delivers tokens, every `completed` request
     * would keep its contact forever and the 90-day sentence on the form would be false. */
    expect(REVIEW_TOKEN_BLOCKS_CLEARING).toBe(false);
  });

  test('a COMPLETED request with no delivered token is still cleared', async () => {
    /* The case that would otherwise never clear: `completed` is exactly the status R3 ties a
     * review to, and `review_token_delivered_at` is null for every request in R1a because
     * nothing sets it. */
    const id = await seedRequest({
      status: 'completed',
      closedAt: epoch(NOW) - CONTACT_RETENTION_DAYS * DAY,
      preferredTo: '2027-01-01',
      reviewTokenDeliveredAt: null,
    });

    expect(await clearExpiredContacts(db, NOW)).toBe(1);
    expect((await readRow(id))?.email).toBeNull();
  });
});

/* ---------------------------------------------------------------------------
 * Idempotence — what makes a manual catch-up safe
 * ------------------------------------------------------------------------- */
describe('the pass is idempotent', () => {
  test('running it twice clears nothing the second time', async () => {
    await seedRequest({ preferredTo: '2027-01-01' });

    expect(await clearExpiredContacts(db, NOW)).toBe(1);
    expect(await clearExpiredContacts(db, NOW)).toBe(0);
  });

  test('a row whose contact is already gone is not stamped', async () => {
    /* `contactClearedAt` means "this pass cleared it", not "there is nothing here" — otherwise
     * the stamp stops being evidence of anything. */
    const id = await seedRequest({ preferredTo: '2027-01-01', email: null, phone: null });

    expect(await clearExpiredContacts(db, NOW)).toBe(0);
    expect((await readRow(id))?.contact_cleared_at).toBeNull();
  });

  test('an already-stamped row is skipped even if contact somehow returned', async () => {
    const id = await seedRequest({
      preferredTo: '2027-01-01',
      contactClearedAt: epoch(NOW) - DAY,
    });

    expect(await clearExpiredContacts(db, NOW)).toBe(0);
    expect((await readRow(id))?.email).toBe(FAKE_EMAIL);
  });
});

/* ---------------------------------------------------------------------------
 * The 24-month delete
 * ------------------------------------------------------------------------- */
describe('the whole request is deleted at 24 months', () => {
  test('exactly 24 calendar months old is deleted', async () => {
    /* Calendar months, not 730 days: two years before 2027-06-01 is 2025-06-01, whatever the
     * leap years in between did. */
    await seedRequest({ createdAt: epoch(new Date('2025-06-01T00:00:00Z')) });

    expect(await deleteExpiredRequests(db, NOW)).toBe(1);
    expect(await countRows()).toBe(0);
  });

  test('one second short of 24 months is kept', async () => {
    await seedRequest({ createdAt: epoch(new Date('2025-06-01T00:00:01Z')) });

    expect(await deleteExpiredRequests(db, NOW)).toBe(0);
    expect(await countRows()).toBe(1);
  });

  test('it deletes regardless of whether the contact was cleared first', async () => {
    /* The delete is not conditional on the clearing having happened: a request that was never
     * closed and never had dates still goes at 24 months. */
    await seedRequest({
      reference: 'TESTAAAA2345',
      createdAt: epoch(new Date('2024-01-01T00:00:00Z')),
      contactClearedAt: null,
      status: 'new',
    });

    expect(await deleteExpiredRequests(db, NOW)).toBe(1);
    expect(await countRows()).toBe(0);
  });

  test('the retention window is the documented one', () => {
    // The numbers the privacy notice quotes to the traveller, in both languages.
    expect(CONTACT_RETENTION_DAYS).toBe(90);
    expect(REQUEST_RETENTION_MONTHS).toBe(24);
  });
});

/* ---------------------------------------------------------------------------
 * Both passes together, as the cron runs them
 * ------------------------------------------------------------------------- */
describe('runRetention', () => {
  test('clears and deletes in one call, and counts each separately', async () => {
    // Old enough to delete outright.
    await seedRequest({
      reference: 'TESTAAAA2345',
      createdAt: epoch(new Date('2024-05-01T00:00:00Z')),
    });
    // Past its contact clock, but nowhere near 24 months.
    await seedRequest({ reference: 'TESTBBBB3456', preferredTo: '2027-01-01' });
    // Brand new: untouched by either pass.
    await seedRequest({
      reference: 'TESTCCCC4567',
      createdAt: epoch(NOW) - DAY,
      preferredTo: null,
    });

    expect(await runRetention(db, NOW)).toEqual({ contactsCleared: 2, requestsDeleted: 1 });
    expect(await countRows()).toBe(2);
  });

  test('clears before deleting, so a deleted row was counted as cleared too', async () => {
    /* One row that is both past its contact clock and past 24 months. Clearing runs first, so
     * it is counted once by each pass — the order is what makes the two numbers add up. */
    await seedRequest({ createdAt: epoch(new Date('2024-01-01T00:00:00Z')) });

    expect(await runRetention(db, NOW)).toEqual({ contactsCleared: 1, requestsDeleted: 1 });
    expect(await countRows()).toBe(0);
  });
});
