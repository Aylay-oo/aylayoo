import { createMiddleware } from 'hono/factory';
import { errorSummary } from './logging';
import type { AppEnv } from '../types';

type RateLimitOptions = {
  /** Used in the KV key, so each endpoint gets its own counter. */
  name: string;
  /** How many requests one IP may make per window. */
  limit: number;
  /** Window length in seconds (KV's shortest TTL is 60). */
  windowSeconds: number;
};

// Cloudflare sets CF-Connecting-IP on every real request; the others are
// only there to keep local dev and proxies working.
function clientIp(headers: { get(name: string): string | null }) {
  return (
    headers.get('CF-Connecting-IP') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * Fixed-window IP rate limit backed by KV.
 *
 * We use KV rather than the native `ratelimits` binding because that binding
 * only supports 10s or 60s windows, and these endpoints need hour-long ones.
 *
 * Two known trade-offs, both acceptable for spam control:
 *  - read-then-write isn't atomic, so simultaneous requests can overshoot the
 *    limit slightly;
 *  - if KV itself fails we let the request through rather than take the API
 *    down (the failure is logged).
 */
export function rateLimit({ name, limit, windowSeconds }: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const kv = c.env.RATE_LIMIT;
    if (!kv) {
      console.warn(`RATE_LIMIT KV binding missing — "${name}" is not rate limited`);
      return next();
    }

    const ip = clientIp(c.req.raw.headers);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
    const key = `rl:${name}:${ip}:${windowStart}`;

    let used = 0;
    try {
      used = Number(await kv.get(key)) || 0;
    } catch (err) {
      /* The limiter's name and the message only — never `err` itself and never `key`, which
       * embeds the client IP. An IP is personal data whether or not it looks like one. */
      console.error(`Rate limit lookup failed for "${name}", allowing request:`, errorSummary(err));
      return next();
    }

    if (used >= limit) {
      const retryAfter = windowStart + windowSeconds - nowSeconds;
      c.header('Retry-After', String(Math.max(1, retryAfter)));
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }

    try {
      await kv.put(key, String(used + 1), {
        // KV refuses a TTL below 60 seconds.
        expirationTtl: Math.max(60, windowSeconds),
      });
    } catch (err) {
      console.error(`Rate limit write failed for "${name}", allowing request:`, errorSummary(err));
    }

    return next();
  });
}
