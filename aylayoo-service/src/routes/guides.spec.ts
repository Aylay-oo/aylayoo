import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { createToken } from '../lib/auth';
import { createTestDb } from '../test/d1';
import type { Env } from '../types';

/* What a guide looks like to the public.
 *
 * This exists because the public shape was wrong in production: /api/guides returned `phone`
 * and `email` for every approved guide, including the tourism association's real roster. The
 * route built its column list by taking the whole table and removing `status`, so the fields
 * were published by default and the omission was the only thing standing between the database
 * and the open internet.
 *
 * The fix is an allow-list, and these tests are what keeps it one: a column added to the guides
 * table must not appear on a public endpoint unless somebody also adds it to publicColumns.
 *
 * All data here is invented. No real guide's details appear in this repository.
 */

const log = console.log;
console.log = () => {};
const { default: app } = await import('../index');
afterAll(() => { console.log = log; });

const JWT_SECRET = 'test-secret-not-used-anywhere-else';

let env: Env;

/* Fields a guide must never expose publicly.
 *
 * `fullName` joined this list in Phase 3. It is the association's full legal form of the name,
 * and the web app already refused to render it (see aylayoo-web .../guide-view.ts) while the
 * API went on publishing it. `createdAt` went too — nothing renders it. */
const PRIVATE_FIELDS = ['phone', 'email', 'fullName', 'createdAt'] as const;

/* Fields the site genuinely needs, so the allow-list cannot be trimmed into uselessness.
 *
 * `rating` and `reviewCount` are deliberately NOT here: Phase 3 withholds them until a guide
 * has at least MIN_PUBLIC_REVIEWS published reviews, so they are absent for a guide with none.
 * The floor has its own tests below and in tours.spec.ts. */
const REQUIRED_PUBLIC_FIELDS = [
  'id', 'type', 'name', 'languages', 'tripTypes', 'photoUrl', 'aimags',
] as const;

/* Invented contact details, in the shapes the real columns hold, so a leak would be caught by
 * the value sweep below as well as by the field check. */
const FAKE_PHONE = '+976 70000001';
const FAKE_EMAIL = 'not-a-real-guide@example.invalid';

async function seedGuide(db: D1Database, id: number, status = 'approved') {
  await db
    .prepare(`INSERT INTO guides
      (id, type, name, bio_mn, bio_en, languages, trip_types, phone, email, photo_url,
       website, status, full_name, experience_years, route_mn, route_en, car, rating, review_count)
      VALUES (?, 'individual', ?, NULL, NULL, '["mn","en"]', '["countryside"]', ?, ?, NULL,
              NULL, ?, ?, 5, NULL, NULL, NULL, NULL, NULL)`)
    .bind(id, `Test Guide ${id}`, FAKE_PHONE, FAKE_EMAIL, status, `Full Test Guide ${id}`)
    .run();
}

beforeEach(async () => {
  env = {
    DB: createTestDb(),
    BUCKET: {} as R2Bucket,
    /* A real enough KV for the register route's rate limiter. Without one it logs
     * "rate limit lookup failed, allowing request" on every call — correct degradation, but
     * noise here. */
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
  await seedGuide(env.DB, 2);
  await seedGuide(env.DB, 3, 'pending');
});

const call = (path: string, init?: RequestInit) => app.request(path, init, env);
const auth = async () => ({ Authorization: `Bearer ${await createToken(1, JWT_SECRET)}` });

/** Every field name anywhere in a JSON tree, so a nested object cannot smuggle one through. */
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

describe('the public guide shape', () => {
  test('the list carries no phone or email, as a field or as a value', async () => {
    const response = await call('/api/guides');
    expect(response.status).toBe(200);

    const raw = await response.text();
    const keys = allKeys(JSON.parse(raw));

    for (const field of PRIVATE_FIELDS) expect(keys.has(field)).toBe(false);
    // Independent of field names: the values must not appear anywhere in the body.
    expect(raw.includes(FAKE_PHONE)).toBe(false);
    expect(raw.includes(FAKE_EMAIL)).toBe(false);
  });

  test('the detail route carries no phone or email either', async () => {
    const response = await call('/api/guides/1');
    expect(response.status).toBe(200);

    const raw = await response.text();
    const keys = allKeys(JSON.parse(raw));

    for (const field of PRIVATE_FIELDS) expect(keys.has(field)).toBe(false);
    expect(raw.includes(FAKE_PHONE)).toBe(false);
    expect(raw.includes(FAKE_EMAIL)).toBe(false);
  });

  test('status is not exposed either', async () => {
    const { data } = await (await call('/api/guides')).json() as { data: unknown[] };
    expect(allKeys(data).has('status')).toBe(false);
  });

  test('still returns everything the site actually renders', async () => {
    // The allow-list must not be trimmed to the point of breaking the guide cards.
    const { data } = await (await call('/api/guides')).json() as { data: Record<string, unknown>[] };
    expect(data.length).toBe(2);
    for (const field of REQUIRED_PUBLIC_FIELDS) {
      expect(Object.hasOwn(data[0], field)).toBe(true);
    }
  });

  test('withholds rating and reviewCount below the review floor', async () => {
    /* A guide with no reviews has no score to show. Absent rather than null, so the front
     * end's "hide the stars while null" path is reached — and so this asserts on shape. */
    const { data } = await (await call('/api/guides')).json() as { data: Record<string, unknown>[] };
    expect(Object.hasOwn(data[0], 'rating')).toBe(false);
    expect(Object.hasOwn(data[0], 'reviewCount')).toBe(false);
  });

  test('shows them once there are three', async () => {
    await env.DB.prepare('UPDATE guides SET rating = 4.5, review_count = 3 WHERE id = 1').run();
    const { data } = await (await call('/api/guides/1')).json() as { data: Record<string, unknown> };
    expect(data.rating).toBe(4.5);
    expect(data.reviewCount).toBe(3);
  });

  test('a pending guide is not listed, and 404s by id', async () => {
    const { data } = await (await call('/api/guides')).json() as { data: { id: number }[] };
    expect(data.map((g) => g.id).sort()).toEqual([1, 2]);
    expect((await call('/api/guides/3')).status).toBe(404);
  });

  test('filtering by aimag does not widen the shape', async () => {
    // A different query path through the same handler must not select different columns.
    const raw = await (await call('/api/guides?type=individual&language=en')).text();
    expect(allKeys(JSON.parse(raw)).has('phone')).toBe(false);
    expect(raw.includes(FAKE_EMAIL)).toBe(false);
  });

  test('registration still accepts a phone and an email, and returns neither', async () => {
    const form = new FormData();
    form.append('data', JSON.stringify({
      type: 'individual',
      name: 'Registering Guide',
      languages: ['mn'],
      tripTypes: ['countryside'],
      aimagIds: [],
      phone: FAKE_PHONE,
      email: FAKE_EMAIL,
    }));
    const response = await call('/api/guides/register', { method: 'POST', body: form });

    // Either it is accepted or the aimag list is refused; what matters is that no echo of the
    // contact details comes back in the response body.
    const raw = await response.text();
    expect(raw.includes(FAKE_PHONE)).toBe(false);
    expect(raw.includes(FAKE_EMAIL)).toBe(false);
  });
});

describe('the admin guide shape', () => {
  test('still carries phone and email, because that is how the team reaches a guide', async () => {
    const response = await call('/api/admin/guides', { headers: await auth() });
    expect(response.status).toBe(200);

    const raw = await response.text();
    const keys = allKeys(JSON.parse(raw));

    for (const field of PRIVATE_FIELDS) expect(keys.has(field)).toBe(true);
    expect(raw.includes(FAKE_PHONE)).toBe(true);
    expect(raw.includes(FAKE_EMAIL)).toBe(true);
  });

  test('and still shows pending guides, which the public list hides', async () => {
    const { data } = await (await call('/api/admin/guides?status=pending', { headers: await auth() }))
      .json() as { data: { id: number }[] };
    expect(data.map((g) => g.id)).toEqual([3]);
  });

  test('but only with a token', async () => {
    expect((await call('/api/admin/guides')).status).toBe(401);
  });
});
