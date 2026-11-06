import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { createToken } from '../lib/auth';
import { formatReference, newReference, normaliseReference } from '../lib/reference';
import { createTestDb } from '../test/d1';
import type { Env } from '../types';

/* Trip requests — the first traveller data this project stores.
 *
 * What this file guards, in the order the data moves:
 *
 *   1. A request is answerable and not spam: phone-or-email, a message floor, a honeypot, a
 *      per-IP rate limit and a per-guide daily cap.
 *   2. Contact details never appear in free text, because the message is relayed to the guide
 *      before the contact is.
 *   3. The staging: the admin list WITHHOLDS the traveller's phone and email until the guide
 *      has accepted, so an unanswered request discloses nothing.
 *   4. The response tells the traveller their reference and nothing else.
 *   5. Erasure needs both halves and never says which one was wrong.
 *
 * Every value here is invented. No real traveller or guide details appear in this repository.
 */

const log = console.log;
console.log = () => undefined;
const { app } = await import('../index');
afterAll(() => { console.log = log; });

const JWT_SECRET = 'test-secret-not-used-anywhere-else';

let env: Env;

const FAKE_TRAVELLER_EMAIL = 'not-a-real-traveller@example.invalid';
const FAKE_TRAVELLER_PHONE = '+976 70000111';
const FAKE_GUIDE_PHONE = '+976 70000222';
const FAKE_GUIDE_EMAIL = 'not-a-real-guide@example.invalid';

async function seedGuide(db: D1Database, id: number, status = 'approved') {
  await db
    .prepare(`INSERT INTO guides
      (id, type, name, bio_mn, bio_en, languages, trip_types, phone, email, photo_url,
       website, status, experience_years)
      VALUES (?, 'individual', ?, NULL, NULL, '["mn"]', '["city"]', ?, ?, NULL, NULL, ?, 5)`)
    .bind(id, `Test Guide ${id}`, FAKE_GUIDE_PHONE, FAKE_GUIDE_EMAIL, status)
    .run();
}

beforeEach(async () => {
  env = {
    DB: createTestDb(),
    BUCKET: {} as R2Bucket,
    RATE_LIMIT: (() => {
      const store = new Map<string, string>();
      return {
        get: async (k: string) => store.get(k) ?? null,
        put: async (k: string, v: string) => { store.set(k, v); },
      };
    })() as unknown as KVNamespace,
    JWT_SECRET,
    ALLOWED_ORIGINS: 'http://localhost:3000',
  };
  await seedGuide(env.DB, 1);
});

const call = (path: string, init?: RequestInit) => app.request(path, init, env);
const auth = async () => ({ Authorization: `Bearer ${await createToken(1, JWT_SECRET)}` });
const json = { 'Content-Type': 'application/json' };

function allKeys(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, into));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      into.add(k);
      allKeys(v, into);
    }
  }
  return into;
}

const consent = async (scope = 'requests', guideId = 1) => {
  const r = await call('/api/admin/guide-consent', {
    method: 'POST',
    headers: { ...json, ...(await auth()) },
    body: JSON.stringify({ guideId, scope, source: 'guide', evidenceNote: 'Invented for tests' }),
  });
  expect(r.status).toBe(201);
};

const aRequest = (over: Record<string, unknown> = {}) => ({
  travellerName: 'Test Traveller',
  email: FAKE_TRAVELLER_EMAIL,
  message: 'Two of us would like a short walking tour of the city centre next week, please.',
  partySize: 2,
  guideId: 1,
  ...over,
});

const submit = (over: Record<string, unknown> = {}) =>
  call('/api/trips/requests', {
    method: 'POST', headers: json, body: JSON.stringify(aRequest(over)),
  });

/* ---------------------------------------------------------------------------
 * The reference
 * ------------------------------------------------------------------------- */
describe('the request reference', () => {
  test('is 12 characters from an unambiguous alphabet', () => {
    const ref = newReference();
    expect(ref).toHaveLength(12);
    // No I, L, O or U: unreadable next to 1 and 0, or liable to make words.
    expect(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{12}$/.test(ref)).toBe(true);
  });

  test('does not repeat across many draws', () => {
    const seen = new Set(Array.from({ length: 500 }, () => newReference()));
    expect(seen.size).toBe(500);
  });

  test('formats for reading and normalises back', () => {
    const ref = newReference();
    expect(formatReference(ref)).toHaveLength(14); // 12 + two dashes
    expect(normaliseReference(formatReference(ref))).toBe(ref);
    expect(normaliseReference(`  ${ref.toLowerCase()}  `)).toBe(ref);
  });

  test('refuses a wrong length or a lookalike character, rather than correcting it', () => {
    // Turning a typed O into 0 could match somebody else's request.
    expect(normaliseReference('ABC')).toBeNull();
    expect(normaliseReference('OOOOOOOOOOOO')).toBeNull();
    expect(normaliseReference('IIIIIIIIIIII')).toBeNull();
  });

  test('is not the row id', async () => {
    await consent();
    const { data } = await (await submit()).json() as { data: { reference: string } };
    expect(data.reference).not.toBe('1');
    expect(data.reference).toHaveLength(12);
  });
});

/* ---------------------------------------------------------------------------
 * Submitting
 * ------------------------------------------------------------------------- */
describe('submitting a request', () => {
  test('works, and returns only the reference', async () => {
    await consent();
    const response = await submit();
    expect(response.status).toBe(201);

    const raw = await response.text();
    const keys = allKeys(JSON.parse(raw));

    expect(keys.has('reference')).toBe(true);

    /* No echo of anything that was sent. An endpoint that reflects its input is one somebody
     * can use to test whether a value is valid.
     *
     * `message` is NOT in this list: it is the envelope's own status line ("Request received…"),
     * the same shape /api/guides/register returns. The traveller's message is checked by value
     * below, which is the thing that actually matters — a key name is not the leak. */
    for (const field of ['email', 'phone', 'travellerName', 'id']) {
      expect(keys.has(field)).toBe(false);
    }
    expect(raw.includes(FAKE_TRAVELLER_EMAIL)).toBe(false);
    expect(raw.includes('Test Traveller')).toBe(false);
    // The traveller's own words, by value.
    expect(raw.includes('short walking tour')).toBe(false);
  });

  test('needs a phone or an email', async () => {
    await consent();
    expect((await submit({ email: '', phone: '' })).status).toBe(400);
  });

  test('accepts a phone alone', async () => {
    await consent();
    expect((await submit({ email: '', phone: FAKE_TRAVELLER_PHONE })).status).toBe(201);
  });

  test('needs to be addressed to a tour or a guide', async () => {
    await consent();
    expect((await submit({ guideId: null })).status).toBe(400);
  });

  test('refuses a message shorter than the floor — most spam fails here', async () => {
    await consent();
    expect((await submit({ message: 'hi' })).status).toBe(400);
  });

  test('refuses dates in the wrong order', async () => {
    await consent();
    expect((await submit({ preferredFrom: '2027-05-10', preferredTo: '2027-05-01' })).status)
      .toBe(400);
  });

  test('the honeypot refuses a filled hidden field', async () => {
    await consent();
    expect((await submit({ website: 'http://spam.example' })).status).toBe(400);
  });

  test('refuses a guide who has not agreed to receive requests', async () => {
    // No consent recorded at all.
    const response = await submit();
    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toMatch(/not taking trip requests/i);
  });

  test('tours consent is not requests consent', async () => {
    await consent('tours');
    expect((await submit()).status).toBe(409);
  });

  test('refuses a guide who is not approved', async () => {
    await consent();
    await env.DB.prepare("UPDATE guides SET status = 'pending' WHERE id = 1").run();
    expect((await submit()).status).toBe(400);
  });

  test('refuses a request naming a draft tour', async () => {
    await consent();
    await consent('tours');
    const tour = await (await call('/api/admin/tours', {
      method: 'POST',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ titleMn: 'Т', titleEn: 'T', guideId: 1 }),
    })).json() as { data: { id: number } };

    // A draft is not something a traveller can have seen — a stale link, or somebody probing.
    const response = await submit({ guideId: null, tourId: tour.data.id });
    expect(response.status).toBe(400);
  });

  test('the per-IP rate limit caps it at five an hour', async () => {
    await consent();
    const codes: number[] = [];
    for (let i = 0; i < 7; i += 1) codes.push((await submit()).status);

    expect(codes.filter((c) => c === 201)).toHaveLength(5);
    expect(codes.filter((c) => c === 429)).toHaveLength(2);
  });

  /* The per-guide daily cap.
   *
   * Seeded straight into the table rather than submitted, for two reasons: the per-IP limit
   * above would refuse the 6th request long before the 20th, and the cap is counted from the
   * stored rows anyway — that is the point of it. It holds across many IPs and across a KV
   * outage, because what it protects is a property of the table and not of a counter.
   */
  const seedRequestsFor = async (guideId: number, howMany: number) => {
    for (let i = 0; i < howMany; i += 1) {
      await env.DB
        .prepare(`INSERT INTO trip_requests (reference, traveller_name, message, guide_id)
                  VALUES (?, 'Test Traveller', 'An invented request, seeded by these tests.', ?)`)
        .bind(`TESTCAP${String(i).padStart(4, '0')}`, guideId)
        .run();
    }
  };

  test('the per-guide daily cap refuses the 21st request for one guide', async () => {
    await consent();
    await seedRequestsFor(1, 20);

    const response = await submit();

    expect(response.status).toBe(429);
    // So a client knows this is worth retrying, and roughly when.
    expect(response.headers.get('Retry-After')).toBe('3600');
  });

  test('the 20th is still accepted — the cap is not off by one', async () => {
    await consent();
    await seedRequestsFor(1, 19);

    expect((await submit()).status).toBe(201);
  });

  test('the cap is per guide, so one flooded guide does not close the others', async () => {
    await consent();
    await seedGuide(env.DB, 2);
    await consent('requests', 2);
    await seedRequestsFor(1, 20);

    // Guide 1 is at the cap; guide 2 is untouched by it.
    expect((await submit()).status).toBe(429);
    expect((await submit({ guideId: 2 })).status).toBe(201);
  });

  test('requests older than a day do not count towards the cap', async () => {
    /* The window is 24 hours, so yesterday's flood must not keep a guide closed today. */
    await consent();
    await seedRequestsFor(1, 20);
    await env.DB
      .prepare("UPDATE trip_requests SET created_at = unixepoch() - 60 * 60 * 25 WHERE guide_id = 1")
      .run();

    expect((await submit()).status).toBe(201);
  });
});

/* ---------------------------------------------------------------------------
 * Contact details in free text
 * ------------------------------------------------------------------------- */
describe('contact details are refused inside the message', () => {
  beforeEach(consent);

  const withMessage = (message: string) => submit({ message: `${message} We are two people.` });

  test.each([
    'My email is not-a-real-traveller@example.invalid and I check it daily',
    'Call me on +976 7000 0111 any time of the afternoon',
    'Reach me at 97670000111 whenever suits you best',
    'my number is 7000-0111 if that is easier for you',
  ])('refuses: %s', async (message) => {
    const response = await withMessage(message);
    expect(response.status).toBe(400);
  });

  test('says why, rather than silently stripping it', async () => {
    const response = await withMessage('Call me on +976 7000 0111 please');
    const body = await response.json() as { details?: { message: string }[] };
    // Refused, not edited: the guide must not receive a message that looks like the traveller
    // forgot to include something.
    expect(JSON.stringify(body)).toMatch(/leave your phone number and email out/i);
  });

  test('a message with ordinary numbers still gets through', async () => {
    expect((await withMessage('We are 2 adults and would like about 3 hours on the 5th.')).status)
      .toBe(201);
  });

  /* Dates.
   *
   * A date is seven or more digits separated by dashes, so before withoutDates() existed
   * "we arrive on 2026-07-14" was refused — and the refusal told the traveller to take out a
   * phone number they had not written, which is an error nobody can act on. Found by the web
   * form's own spec for the same rule.
   */
  test.each([
    // The two that genuinely exercise withoutDates: dashed, so PHONE_SHAPED would match.
    'We arrive on 2026-07-14 and leave on the 20th.',
    'We arrive 14-07-2026 and fly home on the 20th.',
    /* These two pass even without the exclusion, because PHONE_SHAPED only treats spaces and
     * dashes as separators — they are here to hold that still true if somebody ever widens the
     * separator class, which would otherwise silently start refusing them. */
    'Can we go on 14/07/2026, or would 15/07/2026 be better?',
    'We land 14.07.2026 in the morning.',
  ])('allows a date: %s', async (message) => {
    expect((await withMessage(message)).status).toBe(201);
  });

  test('a number written in date-like groups is still refused', async () => {
    /* The limit of the exclusion: 99-11-2233 has a four-digit tail, but 99 is not a day and
     * 2233 is not a year, so it is not a date and does not get waved through. */
    expect((await withMessage('ring me on 99-11-2233')).status).toBe(400);
  });
});

/* ---------------------------------------------------------------------------
 * The admin relay, and the staging
 * ------------------------------------------------------------------------- */
describe('the admin relay withholds the contact until the guide accepts', () => {
  let id: number;

  beforeEach(async () => {
    await consent();
    await submit();
    const { data } = await (await call('/api/admin/trip-requests', { headers: await auth() }))
      .json() as { data: { id: number }[] };
    id = data[0].id;
  });

  const list = async () =>
    (await (await call('/api/admin/trip-requests', { headers: await auth() })).json() as {
      data: Record<string, unknown>[];
    }).data;

  const setStatus = async (status: string) => call(`/api/admin/trip-requests/${id}`, {
    method: 'PATCH',
    headers: { ...json, ...(await auth()) },
    body: JSON.stringify({ status }),
  });

  test('a new request shows what the guide needs, but not the contact', async () => {
    const [row] = await list();

    for (const field of ['travellerName', 'message', 'partySize', 'reference']) {
      expect(Object.hasOwn(row, field)).toBe(true);
    }
    // Absent, not blanked — a blank field reads as missing data.
    expect(Object.hasOwn(row, 'email')).toBe(false);
    expect(Object.hasOwn(row, 'phone')).toBe(false);
    expect(row.contactWithheld).toBe(true);
  });

  test('the value is absent from the whole body, not just the field', async () => {
    const raw = await (await call('/api/admin/trip-requests', { headers: await auth() })).text();
    expect(raw.includes(FAKE_TRAVELLER_EMAIL)).toBe(false);
  });

  test('relaying does NOT unlock it — only accepting does', async () => {
    await setStatus('relayed');
    const [row] = await list();
    expect(row.status).toBe('relayed');
    expect(row.contactWithheld).toBe(true);
    expect(Object.hasOwn(row, 'email')).toBe(false);
  });

  test('accepting unlocks it', async () => {
    await setStatus('accepted');
    const [row] = await list();

    expect(row.contactWithheld).toBe(false);
    expect(row.email).toBe(FAKE_TRAVELLER_EMAIL);
    expect(row.acceptedAt).not.toBeNull();
  });

  test('the guide’s own contact is always there — it is how the admin relays at all', async () => {
    const [row] = await list();
    expect((row.guide as { phone: string }).phone).toBe(FAKE_GUIDE_PHONE);
  });

  test('closing sets closedAt; reopening clears it, so the retention clock is honest', async () => {
    await setStatus('declined');
    expect((await list())[0].closedAt).not.toBeNull();

    await setStatus('relayed');
    expect((await list())[0].closedAt).toBeNull();
  });

  test('completing keeps the time it was accepted', async () => {
    await setStatus('accepted');
    const accepted = (await list())[0].acceptedAt;
    await setStatus('completed');
    expect((await list())[0].acceptedAt).toEqual(accepted);
  });

  test('spam is deleted, not labelled — we do not keep a stranger’s number to file it', async () => {
    expect((await call(`/api/admin/trip-requests/${id}`, {
      method: 'DELETE', headers: await auth(),
    })).status).toBe(200);
    expect(await list()).toHaveLength(0);
  });

  test('every trip-request route needs a token', async () => {
    expect((await call('/api/admin/trip-requests')).status).toBe(401);
    expect((await call(`/api/admin/trip-requests/${id}`, { method: 'DELETE' })).status).toBe(401);
    expect((await call('/api/admin/trip-requests/erasure-lookup', {
      method: 'POST', headers: json, body: '{}',
    })).status).toBe(401);
  });

  test('requests are never public — there is no public read route at all', async () => {
    for (const path of ['/api/trips/requests', '/api/trips/requests/1', `/api/trips/${id}`]) {
      const response = await call(path);
      // 404 or 405, never 200 with data.
      expect(response.status).not.toBe(200);
    }
  });
});

/* ---------------------------------------------------------------------------
 * Erasure
 * ------------------------------------------------------------------------- */
describe('erasure needs both halves and reveals nothing', () => {
  let reference: string;

  beforeEach(async () => {
    await consent();
    reference = ((await (await submit()).json()) as { data: { reference: string } }).data.reference;
  });

  const lookup = async (body: Record<string, unknown>) =>
    (await call('/api/admin/trip-requests/erasure-lookup', {
      method: 'POST', headers: { ...json, ...(await auth()) }, body: JSON.stringify(body),
    })).json() as Promise<{ data: Record<string, unknown> }>;

  test('matches on the reference and the contact together', async () => {
    const { data } = await lookup({ reference, contact: FAKE_TRAVELLER_EMAIL });
    expect(data.matched).toBe(true);
    expect(data.id).toBe(1);
  });

  test('tolerates formatting and case, as a person would type it', async () => {
    const { data } = await lookup({
      reference: formatReference(reference).toLowerCase(),
      contact: FAKE_TRAVELLER_EMAIL.toUpperCase(),
    });
    expect(data.matched).toBe(true);
  });

  test('a right reference with a wrong contact does not match', async () => {
    const { data } = await lookup({ reference, contact: 'someone-else@example.invalid' });
    expect(data.matched).toBe(false);
  });

  test('a wrong reference and an unknown reference answer identically', async () => {
    const wrongShape = await lookup({ reference: 'NOPE', contact: FAKE_TRAVELLER_EMAIL });
    const unknown = await lookup({ reference: newReference(), contact: FAKE_TRAVELLER_EMAIL });

    /* The same answer either way, so the endpoint cannot be used to learn whether a reference
     * exists — or whether a given contact is in the database. */
    expect(wrongShape.data).toEqual(unknown.data);
    expect(wrongShape.data.matched).toBe(false);
  });

  test('never returns the stored contact', async () => {
    const raw = JSON.stringify(await lookup({ reference, contact: FAKE_TRAVELLER_EMAIL }));
    expect(raw.includes(FAKE_TRAVELLER_EMAIL)).toBe(false);
    expect(raw.includes(FAKE_TRAVELLER_PHONE)).toBe(false);
  });

  test('matches a phone however it was spaced', async () => {
    await env.DB
      .prepare('UPDATE trip_requests SET email = NULL, phone = ? WHERE reference = ?')
      .bind(FAKE_TRAVELLER_PHONE, reference)
      .run();

    const { data } = await lookup({ reference, contact: '97670000111' });
    expect(data.matched).toBe(true);
  });

  test('says so when the retention pass has already cleared the contact', async () => {
    await env.DB
      .prepare('UPDATE trip_requests SET email = NULL, phone = NULL, contact_cleared_at = ? WHERE reference = ?')
      .bind(Math.floor(Date.now() / 1000), reference)
      .run();

    const { data } = await lookup({ reference, contact: FAKE_TRAVELLER_EMAIL });
    // Honest: there is nothing left to compare, which is not the same as "no such request".
    expect(data.matched).toBe(false);
    expect(data.contactAlreadyCleared).toBe(true);
  });

  test('the lookup does not delete anything on its own', async () => {
    await lookup({ reference, contact: FAKE_TRAVELLER_EMAIL });
    const { data } = await (await call('/api/admin/trip-requests', { headers: await auth() }))
      .json() as { data: unknown[] };
    // Erasure is a deliberate second act.
    expect(data).toHaveLength(1);
  });
});
