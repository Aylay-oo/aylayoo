import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { createToken } from '../lib/auth';
import { createTestDb } from '../test/d1';
import type { Env } from '../types';

/* Guide-led tours: the public shape, the consent gate, and the rating floor.
 *
 * A tour names a real person, so this file guards three things that all fail silently:
 *
 *   1. The public shape. A tour embeds a guide, which means the service decides what a guide
 *      looks like to the public in a second place. Phase 2's incident was exactly this kind of
 *      mistake made once — see docs/incidents.md.
 *   2. The consent gate. Publishing a tour commits a named guide to running it. The check is in
 *      the API, not the admin screen, and these tests are what keep it there.
 *   3. The rating floor. A guide's score is withheld until enough reviews exist, because a
 *      single review rendering as "5.0" misstates the data about somebody's livelihood.
 *
 * All data here is invented. No real guide's details appear in this repository.
 */

const log = console.log;
console.log = () => undefined;
const { app } = await import('../index');
afterAll(() => { console.log = log; });

const JWT_SECRET = 'test-secret-not-used-anywhere-else';

let env: Env;

/** Details a guide row needs. Invented, and shaped like the real columns so a leak is visible. */
const FAKE_PHONE = '+976 70000002';
const FAKE_EMAIL = 'not-a-real-guide@example.invalid';
const FAKE_FULL_NAME = 'Testname Testfathersname';

async function seedGuide(db: D1Database, id: number, status = 'approved') {
  await db
    .prepare(`INSERT INTO guides
      (id, type, name, bio_mn, bio_en, languages, trip_types, phone, email, photo_url,
       website, status, full_name, experience_years, rating, review_count)
      VALUES (?, 'individual', ?, NULL, NULL, '["mn","en"]', '["city"]', ?, ?, NULL,
              NULL, ?, ?, 5, NULL, NULL)`)
    .bind(id, `Test Guide ${id}`, FAKE_PHONE, FAKE_EMAIL, status, FAKE_FULL_NAME)
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

const aTour = (over: Record<string, unknown> = {}) => ({
  titleMn: 'Хотын явган тур',
  titleEn: 'City walking tour',
  summaryMn: 'Тайлбар',
  summaryEn: 'A summary',
  guideId: 1,
  durationMinutes: 120,
  meetingPointMn: 'Сүхбаатарын талбай',
  meetingPointEn: 'Sukhbaatar Square',
  stops: [],
  ...over,
});

const recordConsent = async (scope = 'tours', guideId = 1) => {
  const response = await call('/api/admin/guide-consent', {
    method: 'POST',
    headers: { ...json, ...(await auth()) },
    body: JSON.stringify({
      guideId, scope, source: 'guide', evidenceNote: 'Invented for this test only',
    }),
  });
  expect(response.status).toBe(201);
  return (await response.json() as { data: { id: number } }).data;
};

const createTour = async (over: Record<string, unknown> = {}) => {
  const response = await call('/api/admin/tours', {
    method: 'POST',
    headers: { ...json, ...(await auth()) },
    body: JSON.stringify(aTour(over)),
  });
  return response;
};

/* ---------------------------------------------------------------------------
 * The consent gate
 * ------------------------------------------------------------------------- */
describe('publishing a tour requires recorded consent', () => {
  test('a draft can be created without consent — drafts commit nobody', async () => {
    const response = await createTour();
    expect(response.status).toBe(201);
    expect((await response.json() as { data: { status: string } }).data.status).toBe('draft');
  });

  test('creating one already published is refused with 409', async () => {
    const response = await createTour({ status: 'published' });
    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toMatch(/consent/i);
  });

  test('publishing by update is refused too — the gate is on both paths', async () => {
    const created = await (await createTour()).json() as { data: { id: number } };

    const response = await call(`/api/admin/tours/${created.data.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ status: 'published' }),
    });

    expect(response.status).toBe(409);
    // And it really did not publish.
    const open = await (await call('/api/city/tours')).json() as { data: unknown[] };
    expect(open.data).toHaveLength(0);
  });

  test('once consent is recorded, publishing works', async () => {
    await recordConsent();
    const response = await createTour({ status: 'published' });
    expect(response.status).toBe(201);

    const open = await (await call('/api/city/tours')).json() as { data: unknown[] };
    expect(open.data).toHaveLength(1);
  });

  test('consent for another scope does not unlock tours', async () => {
    // Agreeing to receive requests is not agreeing to be advertised.
    await recordConsent('requests');
    expect((await createTour({ status: 'published' })).status).toBe(409);
  });

  test('reassigning a published tour to a guide without consent is refused', async () => {
    await recordConsent();
    await seedGuide(env.DB, 2);
    const created = await (await createTour({ status: 'published' })).json() as { data: { id: number } };

    const response = await call(`/api/admin/tours/${created.data.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ guideId: 2 }),
    });

    // Guide 2 never agreed, and the tour is already published — the check uses the guide the
    // tour WOULD have, not the one it has.
    expect(response.status).toBe(409);
  });

  test('revoking consent unpublishes that guide’s tours in the same request', async () => {
    const consent = await recordConsent();
    await createTour({ status: 'published' });

    const response = await call(`/api/admin/guide-consent/${consent.id}/revoke`, {
      method: 'POST',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ reason: 'Invented withdrawal for this test' }),
    });

    expect(response.status).toBe(200);
    expect((await response.json() as { data: { toursUnpublished: number } }).data.toursUnpublished)
      .toBe(1);

    const open = await (await call('/api/city/tours')).json() as { data: unknown[] };
    expect(open.data).toHaveLength(0);
  });

  test('if the unpublish fails, the revoke is rolled back with it', async () => {
    /* The two writes are one D1 batch, and this is the test that proves it.
     *
     * Renaming city_tours away makes the second statement in the batch fail with "no such
     * table". What must NOT happen is the first one sticking: consent revoked while the
     * guide's tours stay published is the site continuing to make a commitment on behalf of
     * somebody who just withdrew it — and because the handler only matches consent rows with
     * `revokedAt IS NULL`, a retry would answer 404 and leave no way back through this
     * endpoint. Either both writes land or neither does. */
    const consent = await recordConsent();
    await createTour({ status: 'published' });

    await env.DB.prepare('ALTER TABLE city_tours RENAME TO city_tours_moved').run();

    const response = await call(`/api/admin/guide-consent/${consent.id}/revoke`, {
      method: 'POST',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ reason: 'Invented withdrawal for this test' }),
    });

    expect(response.status).toBe(500);

    // Put it back, then confirm the consent is still active and the tour still published.
    await env.DB.prepare('ALTER TABLE city_tours_moved RENAME TO city_tours').run();

    const rows = await (await call('/api/admin/guide-consent?guideId=1', { headers: await auth() }))
      .json() as { data: { revokedAt: unknown }[] };
    expect(rows.data).toHaveLength(1);
    expect(rows.data[0].revokedAt).toBeNull();

    const open = await (await call('/api/city/tours')).json() as { data: unknown[] };
    expect(open.data).toHaveLength(1);
  });

  test('a revoked consent is history, not a deletion', async () => {
    const consent = await recordConsent();
    await call(`/api/admin/guide-consent/${consent.id}/revoke`, {
      method: 'POST', headers: { ...json, ...(await auth()) }, body: '{}',
    });

    const rows = await (await call('/api/admin/guide-consent?guideId=1', { headers: await auth() }))
      .json() as { data: { revokedAt: unknown }[] };
    expect(rows.data).toHaveLength(1);
    expect(rows.data[0].revokedAt).not.toBeNull();
  });

  test('consent needs evidence', async () => {
    const response = await call('/api/admin/guide-consent', {
      method: 'POST',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ guideId: 1, scope: 'tours', source: 'guide', evidenceNote: '' }),
    });
    expect(response.status).toBe(400);
  });
});

/* ---------------------------------------------------------------------------
 * The public shape
 * ------------------------------------------------------------------------- */
describe('the public tour shape', () => {
  beforeEach(async () => {
    await recordConsent();
    await createTour({ status: 'published' });
  });

  test('carries no guide contact details, as fields or as values', async () => {
    const raw = await (await call('/api/city/tours')).text();
    const keys = allKeys(JSON.parse(raw));

    for (const field of ['phone', 'email', 'fullName', 'status', 'createdAt']) {
      expect(keys.has(field)).toBe(false);
    }
    expect(raw.includes(FAKE_PHONE)).toBe(false);
    expect(raw.includes(FAKE_EMAIL)).toBe(false);
    expect(raw.includes(FAKE_FULL_NAME)).toBe(false);
  });

  test('the detail route carries none either', async () => {
    const raw = await (await call('/api/city/tours/1')).text();
    expect(allKeys(JSON.parse(raw)).has('phone')).toBe(false);
    expect(raw.includes(FAKE_EMAIL)).toBe(false);
    expect(raw.includes(FAKE_FULL_NAME)).toBe(false);
  });

  test('still embeds what a traveller needs to choose', async () => {
    const { data } = await (await call('/api/city/tours')).json() as {
      data: { titleMn: string; guide: Record<string, unknown> }[];
    };
    expect(data[0].titleMn).toBe('Хотын явган тур');
    for (const field of ['id', 'name', 'photoUrl', 'languages']) {
      expect(Object.hasOwn(data[0].guide, field)).toBe(true);
    }
  });

  test('a draft is absent from the list and 404s by id', async () => {
    const draft = await (await createTour({ titleMn: 'Нооруулга' })).json() as { data: { id: number } };

    const { data } = await (await call('/api/city/tours')).json() as { data: { id: number }[] };
    expect(data.map((t) => t.id)).not.toContain(draft.data.id);

    const byId = await call(`/api/city/tours/${draft.data.id}`);
    const missing = await call('/api/city/tours/999999');
    expect(byId.status).toBe(404);
    // Identical bodies, so the response cannot distinguish a draft from nothing at all.
    expect(await byId.json()).toEqual(await missing.json());
  });

  test('a tour whose guide is not approved disappears with them', async () => {
    await env.DB.prepare("UPDATE guides SET status = 'pending' WHERE id = 1").run();
    const { data } = await (await call('/api/city/tours')).json() as { data: unknown[] };
    expect(data).toHaveLength(0);
    expect((await call('/api/city/tours/1')).status).toBe(404);
  });

  test('admin routes need a token', async () => {
    expect((await call('/api/admin/tours')).status).toBe(401);
    expect((await call('/api/admin/guide-consent')).status).toBe(401);
    expect((await call('/api/admin/tours', { method: 'POST', headers: json, body: '{}' })).status)
      .toBe(401);
  });
});

/* ---------------------------------------------------------------------------
 * The rating floor
 * ------------------------------------------------------------------------- */
describe('ratings are withheld below three published reviews', () => {
  const setRating = (rating: number | null, count: number | null) =>
    env.DB.prepare('UPDATE guides SET rating = ?, review_count = ? WHERE id = 1')
      .bind(rating, count).run();

  beforeEach(async () => {
    await recordConsent();
    await createTour({ status: 'published' });
  });

  test('absent — not null — when the guide has none', async () => {
    const { data } = await (await call('/api/city/tours')).json() as {
      data: { guide: Record<string, unknown> }[];
    };
    // Absent rather than null, so the front end's "hide the stars while null" path is reached
    // and a test can assert on shape rather than value.
    expect(Object.hasOwn(data[0].guide, 'rating')).toBe(false);
    expect(Object.hasOwn(data[0].guide, 'reviewCount')).toBe(false);
  });

  test('still absent at one and two reviews', async () => {
    for (const count of [1, 2]) {
      await setRating(5, count);
      const { data } = await (await call('/api/city/tours')).json() as {
        data: { guide: Record<string, unknown> }[];
      };
      expect(Object.hasOwn(data[0].guide, 'rating')).toBe(false);
    }
  });

  test('present at three', async () => {
    await setRating(4.5, 3);
    const { data } = await (await call('/api/city/tours')).json() as {
      data: { guide: Record<string, unknown> }[];
    };
    expect(data[0].guide.rating).toBe(4.5);
    expect(data[0].guide.reviewCount).toBe(3);
  });

  test('the same floor applies to /api/guides', async () => {
    await setRating(5, 1);
    const raw = await (await call('/api/guides')).text();
    expect(allKeys(JSON.parse(raw)).has('rating')).toBe(false);

    await setRating(5, 3);
    const raw3 = await (await call('/api/guides')).text();
    expect(allKeys(JSON.parse(raw3)).has('rating')).toBe(true);
  });

  test('and to /api/guides/:id', async () => {
    await setRating(5, 2);
    expect(allKeys(await (await call('/api/guides/1')).json()).has('rating')).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
 * The narrowed guide allow-list
 * ------------------------------------------------------------------------- */
describe('the public guide shape no longer leaks the legal name', () => {
  test('/api/guides omits fullName and createdAt', async () => {
    const raw = await (await call('/api/guides')).text();
    const keys = allKeys(JSON.parse(raw));

    // The front end already refused to render fullName (see guide-view.ts); the API was still
    // publishing it. Nothing consumed it but test fixtures.
    expect(keys.has('fullName')).toBe(false);
    expect(keys.has('createdAt')).toBe(false);
    expect(raw.includes(FAKE_FULL_NAME)).toBe(false);
  });

  test('/api/guides/:id omits them too', async () => {
    const raw = await (await call('/api/guides/1')).text();
    expect(allKeys(JSON.parse(raw)).has('fullName')).toBe(false);
    expect(raw.includes(FAKE_FULL_NAME)).toBe(false);
  });

  test('the admin route still has them, because that is how the team works', async () => {
    const raw = await (await call('/api/admin/guides', { headers: await auth() })).text();
    const keys = allKeys(JSON.parse(raw));
    expect(keys.has('fullName')).toBe(true);
    expect(keys.has('phone')).toBe(true);
    expect(raw.includes(FAKE_FULL_NAME)).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
 * A published tour must never expose a guide who is not active
 *
 * `approved` is the only active state; the others are `pending` and `rejected`. A tour can
 * outlive its guide's approval in three ways — the guide is rejected, set back to pending, or
 * deleted — and each has to disappear from both public endpoints. Publishing one in that state
 * is refused outright rather than silently accepted and then filtered, because a row marked
 * "published" that nobody can see reads as a broken site.
 * ------------------------------------------------------------------------- */
describe('inactive guides are not exposed by their tours', () => {
  beforeEach(async () => {
    await recordConsent();
    await createTour({ status: 'published' });
  });

  const publicList = async () =>
    (await (await call('/api/city/tours')).json() as { data: unknown[] }).data;

  test.each(['rejected', 'pending'])('a %s guide takes their tour off both endpoints', async (status) => {
    await env.DB.prepare('UPDATE guides SET status = ? WHERE id = 1').bind(status).run();

    expect(await publicList()).toHaveLength(0);
    expect((await call('/api/city/tours/1')).status).toBe(404);
  });

  test('a deleted guide takes the tour with them, by cascade', async () => {
    await env.DB.prepare('PRAGMA foreign_keys = ON').run();
    await env.DB.prepare('DELETE FROM guides WHERE id = 1').run();

    // The FK is ON DELETE CASCADE: the tour row is gone, not merely hidden.
    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM city_tours').all();
    expect((rows.results[0] as { n: number }).n).toBe(0);
    expect(await publicList()).toHaveLength(0);
    expect((await call('/api/city/tours/1')).status).toBe(404);
  });

  test('re-approving the guide brings the tour back', async () => {
    await env.DB.prepare("UPDATE guides SET status = 'rejected' WHERE id = 1").run();
    expect(await publicList()).toHaveLength(0);

    await env.DB.prepare("UPDATE guides SET status = 'approved' WHERE id = 1").run();
    expect(await publicList()).toHaveLength(1);
  });

  test.each(['rejected', 'pending'])('publishing for a %s guide is refused', async (status) => {
    await env.DB.prepare('UPDATE guides SET status = ? WHERE id = 1').bind(status).run();

    const response = await call('/api/admin/tours', {
      method: 'POST',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify(aTour({ status: 'published', titleMn: 'Хоёр дахь' })),
    });

    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toMatch(/not approved/i);
  });

  test('reassigning a published tour to a non-approved guide is refused', async () => {
    await seedGuide(env.DB, 3, 'pending');
    await recordConsent('tours', 3);

    // Guide 3 has consent but is not approved — consent alone must not be enough.
    const response = await call('/api/admin/tours/1', {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ guideId: 3 }),
    });

    expect(response.status).toBe(409);
    expect((await response.json() as { error: string }).error).toMatch(/not approved/i);
  });

  test('a draft may still point at a non-approved guide — drafts expose nobody', async () => {
    await env.DB.prepare("UPDATE guides SET status = 'pending' WHERE id = 1").run();

    const response = await call('/api/admin/tours', {
      method: 'POST',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify(aTour({ titleMn: 'Нооруулга' })),
    });
    expect(response.status).toBe(201);
  });

  test('the admin list still shows the tour and says why it cannot be published', async () => {
    await env.DB.prepare("UPDATE guides SET status = 'rejected' WHERE id = 1").run();

    const { data } = await (await call('/api/admin/tours', { headers: await auth() }))
      .json() as { data: { guideStatus: string; guideConsentScopes: string[] }[] };

    // The screen needs both facts to explain a disabled publish button.
    expect(data[0].guideStatus).toBe('rejected');
    expect(data[0].guideConsentScopes).toContain('tours');
  });
});
