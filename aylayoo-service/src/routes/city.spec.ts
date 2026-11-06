import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { createToken } from '../lib/auth';
import { createTestDb } from '../test/d1';
import type { Env } from '../types';

/* The city API, against the real schema.
 *
 * These four areas are here because each one is a rule that is invisible when it breaks. A
 * draft leaking is a privacy failure nobody gets an error about; a partial PUT wiping a column
 * looks like a successful save; an empty PUT that reaches drizzle is a 500 with a SQL message;
 * and an admin route that forgets its middleware is a wide-open endpoint that answers 200.
 *
 * The first two were real bugs, found by hand before the API was committed — see the comment
 * above the city schemas in lib/validators.ts. These exist so they cannot come back.
 */

let env: Env;

const JWT_SECRET = 'test-secret-not-used-anywhere-else';

/* The app installs hono/logger on every route, which writes a line per request. Useful under
 * `wrangler dev`, unreadable here — several hundred lines wrapped around the assertions.
 *
 * Silenced for this file only, rather than making the logger conditional in index.ts, so
 * production logging is not shaped by the tests. The import has to be dynamic and come after
 * the swap: hono's `logger()` captures console.log at the moment it is called, which is while
 * index.ts is being evaluated — so a beforeAll would be too late. */
const log = console.log;
console.log = () => undefined;
const { default: app } = await import('../index');
afterAll(() => { console.log = log; });

beforeEach(() => {
  env = {
    DB: createTestDb(),
    // Neither is reachable from the routes under test; the city endpoints touch only D1.
    BUCKET: {} as R2Bucket,
    RATE_LIMIT: {} as KVNamespace,
    JWT_SECRET,
    ALLOWED_ORIGINS: 'http://localhost:3000',
  };
});

/* A token the middleware will accept. No admins row is needed: requireAdmin verifies the
 * signature and does not look the admin up, which is what makes an 8-hour token portable. */
const auth = async () => ({ Authorization: `Bearer ${await createToken(1, JWT_SECRET)}` });

const json = { 'Content-Type': 'application/json' };

const call = (path: string, init?: RequestInit) => app.request(path, init, env);

async function body<T = { data: unknown }>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/** Creates a row through the admin API and returns it. */
async function create(kind: string, input: Record<string, unknown>) {
  const response = await call(`/api/admin/city/${kind}`, {
    method: 'POST',
    headers: { ...json, ...(await auth()) },
    body: JSON.stringify(input),
  });
  expect(response.status).toBe(201);
  return (await body<{ data: Record<string, unknown> }>(response)).data;
}

const STOPS = [
  {
    placeMn: 'Гандан хийд',
    placeEn: 'Gandan Monastery',
    timeOfDay: 'morning',
    noteMn: null,
    noteEn: null,
    lat: 47.9212,
    lng: 106.8944,
  },
  {
    placeMn: 'Зайсан толгой',
    placeEn: 'Zaisan Memorial',
    timeOfDay: 'evening',
    noteMn: null,
    noteEn: null,
    lat: 47.8866,
    lng: 106.91,
  },
];

const anItinerary = (over: Record<string, unknown> = {}) => ({
  titleMn: 'Нэг өдрийн Улаанбаатар',
  titleEn: 'One day in Ulaanbaatar',
  days: 1,
  summaryMn: 'Тайлбар',
  summaryEn: 'A summary',
  stops: STOPS,
  ...over,
});

/* ---------------------------------------------------------------------------
 * 1. A partial PUT changes only what it sends.
 *
 * The bug this pins: the update schemas used to carry Zod defaults, and `.partial()` leaves a
 * default in place. Publishing a row with {"status":"published"} therefore emptied its stops,
 * and renaming a published row quietly unpublished it. Both saves reported success.
 * ------------------------------------------------------------------------- */
describe('a partial PUT leaves everything it did not send alone', () => {
  test('publishing keeps the stops, the summary and the day count', async () => {
    const created = await create('itineraries', anItinerary({ status: 'published' }));

    const response = await call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ status: 'published' }),
    });

    expect(response.status).toBe(200);
    const { data } = await body<{ data: Record<string, unknown> }>(response);
    expect(data.stops).toHaveLength(2);
    expect(data.summaryMn).toBe('Тайлбар');
    expect(data.days).toBe(1);
    expect(data.titleMn).toBe('Нэг өдрийн Улаанбаатар');
  });

  test('renaming keeps the published status and the stops', async () => {
    const created = await create('itineraries', anItinerary({ status: 'published' }));

    const response = await call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ titleMn: 'Шинэ нэр' }),
    });

    const { data } = await body<{ data: Record<string, unknown> }>(response);
    expect(data.titleMn).toBe('Шинэ нэр');
    // The two that used to be reset by their own defaults.
    expect(data.status).toBe('published');
    expect(data.stops).toHaveLength(2);
  });

  test('a new row is a draft, because the column says so and not the schema', async () => {
    const created = await create('itineraries', anItinerary());
    expect(created.status).toBe('draft');
  });

  test('an explicit null still clears a nullable field', async () => {
    // The flip side: "only send what changed" must not make a field impossible to empty.
    const created = await create('itineraries', anItinerary({ status: 'published' }));

    const response = await call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ summaryMn: null }),
    });

    const { data } = await body<{ data: Record<string, unknown> }>(response);
    expect(data.summaryMn).toBeNull();
    expect(data.stops).toHaveLength(2);
    expect(data.status).toBe('published');
  });

  test('sending stops replaces them, so a reorder is a save', async () => {
    const created = await create('itineraries', anItinerary());

    const response = await call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({ stops: [STOPS[1], STOPS[0]] }),
    });

    const { data } = await body<{ data: { stops: { placeMn: string }[] } }>(response);
    expect(data.stops.map((stop) => stop.placeMn)).toEqual(['Зайсан толгой', 'Гандан хийд']);
  });
});

/* ---------------------------------------------------------------------------
 * 2. An empty PUT is refused, not crashed on.
 *
 * Every field on an update schema is optional, so `{}` parses cleanly — and would reach drizzle
 * as an UPDATE with nothing to SET, which is a SQL error and a 500.
 * ------------------------------------------------------------------------- */
describe('an empty PUT', () => {
  test('is a 400 with a message, not a 500', async () => {
    const created = await create('itineraries', anItinerary());

    const response = await call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    expect((await body<{ error: string }>(response)).error).toMatch(/at least one field/i);
  });

  test('leaves the row exactly as it was', async () => {
    const created = await create('itineraries', anItinerary({ status: 'published' }));

    await call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers: { ...json, ...(await auth()) },
      body: JSON.stringify({}),
    });

    const after = await body<{ data: { stops: unknown[]; status: string }[] }>(
      await call('/api/admin/city/itineraries', { headers: await auth() }),
    );
    expect(after.data[0].stops).toHaveLength(2);
    expect(after.data[0].status).toBe('published');
  });

  test('is refused for every resource, not just itineraries', async () => {
    const rows = {
      routes: await create('routes', { titleMn: 'М', titleEn: 'R' }),
      food: await create('food', { nameMn: 'Х', nameEn: 'F' }),
      tips: await create('tips', {
        topic: 'transport', titleMn: 'Т', titleEn: 'T', bodyMn: 'б', bodyEn: 'b',
      }),
      phrases: await create('phrases', {
        phraseMn: 'Сайн', pronunciation: 'Sain', meaningEn: 'Good', category: 'greetings',
      }),
      events: await create('events', { titleMn: 'А', titleEn: 'E', startDate: '2026-12-01' }),
    };

    for (const [kind, row] of Object.entries(rows)) {
      const response = await call(`/api/admin/city/${kind}/${row.id}`, {
        method: 'PUT',
        headers: { ...json, ...(await auth()) },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    }
  });
});

/* ---------------------------------------------------------------------------
 * 3. A draft is not public — by listing or by id.
 *
 * Guessing an id must not be a way around the status filter, which is why the `:id` handlers
 * filter on status as well and answer a draft with the same 404 as a row that is not there.
 * ------------------------------------------------------------------------- */
describe('drafts are not public', () => {
  test('a draft is absent from the public list and present in the admin one', async () => {
    await create('itineraries', anItinerary());

    const open = await body<{ data: unknown[] }>(await call('/api/city/itineraries'));
    expect(open.data).toHaveLength(0);

    const admin = await body<{ data: unknown[] }>(
      await call('/api/admin/city/itineraries', { headers: await auth() }),
    );
    expect(admin.data).toHaveLength(1);
  });

  test('a draft 404s by id, exactly like a row that does not exist', async () => {
    const created = await create('itineraries', anItinerary());

    const draft = await call(`/api/city/itineraries/${created.id}`);
    const missing = await call('/api/city/itineraries/999999');

    expect(draft.status).toBe(404);
    expect(missing.status).toBe(404);
    // Identical bodies, so the response cannot be used to tell a draft from nothing at all.
    expect(await body(draft)).toEqual(await body(missing));
  });

  test('publishing makes it appear, and unpublishing takes it away again', async () => {
    const created = await create('itineraries', anItinerary());
    const headers = { ...json, ...(await auth()) };
    const setStatus = (status: string) => call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status }),
    });

    await setStatus('published');
    expect((await body<{ data: unknown[] }>(await call('/api/city/itineraries'))).data)
      .toHaveLength(1);
    expect((await call(`/api/city/itineraries/${created.id}`)).status).toBe(200);

    await setStatus('draft');
    expect((await body<{ data: unknown[] }>(await call('/api/city/itineraries'))).data)
      .toHaveLength(0);
    expect((await call(`/api/city/itineraries/${created.id}`)).status).toBe(404);
  });

  test('every public list hides drafts', async () => {
    await create('routes', { titleMn: 'М', titleEn: 'R' });
    await create('food', { nameMn: 'Х', nameEn: 'F' });
    await create('tips', {
      topic: 'transport', titleMn: 'Т', titleEn: 'T', bodyMn: 'б', bodyEn: 'b',
    });
    await create('phrases', {
      phraseMn: 'Сайн', pronunciation: 'Sain', meaningEn: 'Good', category: 'greetings',
    });
    // Far enough ahead that it cannot be filtered out for having finished instead.
    await create('events', { titleMn: 'А', titleEn: 'E', startDate: '2099-12-01' });

    for (const kind of ['routes', 'food', 'tips', 'phrases', 'events']) {
      const open = await body<{ data: unknown[] }>(await call(`/api/city/${kind}`));
      expect(open.data).toHaveLength(0);
    }
  });

  test('a draft route 404s by id too', async () => {
    const created = await create('routes', { titleMn: 'М', titleEn: 'R' });
    expect((await call(`/api/city/routes/${created.id}`)).status).toBe(404);
  });
});

/* ---------------------------------------------------------------------------
 * 4. Nothing under /api/admin answers without a token.
 *
 * Being unlinked is not the boundary; this is. The admin city router is mounted inside
 * admin.ts after its `use('*', requireAdmin)`, and this is what proves the mounting order is
 * right — a router mounted before it would be wide open and still answer 200.
 * ------------------------------------------------------------------------- */
describe('the admin city routes need a token', () => {
  const KINDS = ['itineraries', 'routes', 'food', 'tips', 'phrases', 'events'];

  test('every list is 401 without one', async () => {
    for (const kind of KINDS) {
      const response = await call(`/api/admin/city/${kind}`);
      expect(response.status).toBe(401);
    }
  });

  test('every write is 401 without one', async () => {
    for (const kind of KINDS) {
      const writes = [
        call(`/api/admin/city/${kind}`, { method: 'POST', headers: json, body: '{}' }),
        call(`/api/admin/city/${kind}/1`, { method: 'PUT', headers: json, body: '{}' }),
        call(`/api/admin/city/${kind}/1`, { method: 'DELETE' }),
        call(`/api/admin/city/${kind}/reorder`, {
          method: 'PATCH', headers: json, body: JSON.stringify({ ids: [1] }),
        }),
      ];
      for (const response of await Promise.all(writes)) {
        expect(response.status).toBe(401);
      }
    }
  });

  test('a write with no token changes nothing', async () => {
    const created = await create('itineraries', anItinerary({ status: 'published' }));

    await call(`/api/admin/city/itineraries/${created.id}`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ status: 'draft', titleMn: 'Эвдсэн' }),
    });
    await call(`/api/admin/city/itineraries/${created.id}`, { method: 'DELETE' });

    const open = await body<{ data: { titleMn: string }[] }>(await call('/api/city/itineraries'));
    expect(open.data).toHaveLength(1);
    expect(open.data[0].titleMn).toBe('Нэг өдрийн Улаанбаатар');
  });

  test('a malformed or wrongly signed token is 401, not 500', async () => {
    const forged = await createToken(1, 'a-different-secret');

    for (const header of ['', 'Bearer', 'Bearer not-a-jwt', `Bearer ${forged}`, 'Basic abc']) {
      const response = await call('/api/admin/city/itineraries', {
        headers: header ? { Authorization: header } : {},
      });
      expect(response.status).toBe(401);
    }
  });

  test('the public endpoints still need no token at all', async () => {
    // The flip side: the middleware must not have been mounted too widely.
    for (const kind of KINDS) {
      expect((await call(`/api/city/${kind}`)).status).toBe(200);
    }
  });
});
