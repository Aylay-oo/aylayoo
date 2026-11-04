import { describe, expect, test } from 'bun:test';
import { createTestDb } from '../test/d1';
import type { Env } from '../types';
import { errorSummary, pathOnly, redact } from './logging';

/* What may reach a retained log.
 *
 * Workers Logs keeps what this service writes, so these assertions are the boundary between an
 * incident being investigable and the logs themselves becoming a copy of the data we just spent
 * a week removing from the API.
 *
 * Every value below is invented. No real guide's details appear in this repository.
 */

const FAKE_EMAIL = 'not-a-real-guide@example.invalid';
const FAKE_PHONE = '+976 70000001';
const FAKE_LOCAL_PHONE = '70000001';
const FAKE_IP = '203.0.113.7'; // TEST-NET-3, reserved for documentation
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjF9.not-a-real-signature';

describe('redact', () => {
  test('replaces an email address', () => {
    const out = redact(`insert failed for ${FAKE_EMAIL}`);
    expect(out).not.toContain(FAKE_EMAIL);
    expect(out).toContain('[email]');
  });

  test('replaces a phone number, with or without the country code', () => {
    expect(redact(`phone ${FAKE_PHONE}`)).not.toContain('70000001');
    expect(redact(`phone ${FAKE_LOCAL_PHONE}`)).not.toContain('70000001');
  });

  test('replaces a bearer token and a bare JWT', () => {
    expect(redact(`Authorization: Bearer ${FAKE_JWT}`)).not.toContain('eyJ');
    expect(redact(`token ${FAKE_JWT}`)).not.toContain('eyJ');
  });

  test('leaves ordinary text alone, so a log stays readable', () => {
    const plain = 'D1_ERROR: no such column: nickname';
    expect(redact(plain)).toBe(plain);
  });

  test('does not mangle a short number, which is usually a count or a status', () => {
    expect(redact('returned 404 for 22 rows')).toBe('returned 404 for 22 rows');
  });
});

describe('errorSummary', () => {
  test('keeps the type and message', () => {
    expect(errorSummary(new TypeError('kv.get is not a function')))
      .toBe('TypeError: kv.get is not a function');
  });

  test('drops the stack, which is where a D1 driver puts the statement', () => {
    const err = new Error('boom');
    err.stack = `Error: boom\n    at insert (guides.ts:1:1) params: ["${FAKE_PHONE}","${FAKE_EMAIL}"]`;
    const out = errorSummary(err);
    expect(out).not.toContain(FAKE_EMAIL);
    expect(out).not.toContain('70000001');
    expect(out).toBe('Error: boom');
  });

  test('drops `cause`, for the same reason', () => {
    const err = new Error('insert failed', { cause: new Error(`params: ${FAKE_EMAIL}`) });
    expect(errorSummary(err)).not.toContain(FAKE_EMAIL);
  });

  test('redacts the message itself, in case a driver quotes the row', () => {
    // The call sites are meant to be safe already; this is the last line of defence.
    const err = new Error(`UNIQUE constraint failed: guides.email (${FAKE_EMAIL})`);
    const out = errorSummary(err);
    expect(out).not.toContain(FAKE_EMAIL);
    expect(out).toContain('[email]');
  });

  test('survives a non-Error being thrown', () => {
    expect(errorSummary({ weird: true })).toBe('Non-error thrown');
    expect(errorSummary(null)).toBe('Non-error thrown');
    expect(errorSummary(`failed: ${FAKE_EMAIL}`)).not.toContain(FAKE_EMAIL);
  });
});

describe('pathOnly', () => {
  test('strips a query string but keeps the path and the status', () => {
    expect(pathOnly('--> GET /api/guides?aimag=khuvsgul&language=en 200 12ms'))
      .toBe('--> GET /api/guides 200 12ms');
  });

  test('leaves a path with no query untouched', () => {
    expect(pathOnly('<-- GET /api/city/itineraries')).toBe('<-- GET /api/city/itineraries');
  });

  test('would strip an address somebody put in a query', () => {
    // The reason this exists: no endpoint takes one today, and one might tomorrow.
    const out = pathOnly(`--> GET /api/search?email=${FAKE_EMAIL} 200 5ms`);
    expect(out).not.toContain(FAKE_EMAIL);
    // The status and timing survive — only the query goes.
    expect(out).toBe('--> GET /api/search 200 5ms');
  });

  test('an IP in a query string goes too', () => {
    expect(pathOnly(`--> GET /api/x?ip=${FAKE_IP} 200 1ms`)).not.toContain(FAKE_IP);
  });
});

/* The wiring, not just the helpers: that the app really installs the redacting print function
 * and really summarises errors. A helper that is never called protects nothing. */
describe('the app as wired up', () => {
  test('the request log keeps the path and drops the query values', async () => {
    const lines: string[] = [];
    const real = console.log;
    console.log = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
    try {
      const { default: app } = await import('../index');
      await app.request(
        `/api/guides?aimag=khuvsgul&language=en&email=${FAKE_EMAIL}`,
        undefined,
        {
          DB: createTestDb(),
          BUCKET: {} as R2Bucket,
          RATE_LIMIT: {} as KVNamespace,
          JWT_SECRET: 'test-secret',
          ALLOWED_ORIGINS: 'http://localhost:3000',
        } satisfies Env,
      );
    } finally {
      console.log = real;
    }

    const joined = lines.join('\n');
    expect(joined).toContain('/api/guides');
    expect(joined).not.toContain('khuvsgul');
    expect(joined).not.toContain(FAKE_EMAIL);
    expect(joined).not.toContain('?');
  });
});
